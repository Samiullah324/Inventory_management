from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.exceptions import ImproperlyConfigured
from django.test import SimpleTestCase, override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from config.cors import parse_cors_allowed_origins
from inventory.models import Category, InventoryTransaction, Product
from inventory.services import StockError, validate_transaction_change

User = get_user_model()


class CORSConfigTests(SimpleTestCase):
    def test_accepts_localhost_origins(self):
        origins = parse_cors_allowed_origins(
            'http://localhost:5173,http://127.0.0.1:5173',
            debug=True,
        )
        self.assertEqual(origins, ['http://localhost:5173', 'http://127.0.0.1:5173'])

    def test_rejects_untrusted_origin(self):
        with self.assertRaises(ImproperlyConfigured):
            parse_cors_allowed_origins('http://evil.com', debug=False)


@override_settings(CORS_ALLOWED_ORIGINS=['http://localhost:5173'])
class CORSPreflightTests(APITestCase):
    def test_cors_preflight_allows_trusted_local_origin(self):
        response = self.client.options(
            '/api/categories/',
            HTTP_ORIGIN='http://localhost:5173',
            HTTP_ACCESS_CONTROL_REQUEST_METHOD='GET',
        )
        self.assertIn(response.status_code, (200, 204))
        self.assertEqual(response['Access-Control-Allow-Origin'], 'http://localhost:5173')


class AuthenticatedAPITestCase(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(
            username='admin',
            email='admin@example.com',
            password='admin123',
        )
        response = self.client.post(
            reverse('auth_login'),
            {'username': 'admin', 'password': 'admin123'},
            format='json',
        )
        self.token = response.data['access']
        self.refresh = response.data['refresh']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')
        self.category = Category.objects.create(name='Electronics', description='Gadgets')


class AuthenticationTests(APITestCase):
    def setUp(self):
        User.objects.create_superuser(username='admin', password='admin123')

    def test_unauthenticated_request_is_rejected_with_structured_error(self):
        response = self.client.get('/api/categories/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn('error', response.data)
        self.assertIn('details', response.data)

    def test_non_admin_user_is_rejected(self):
        User.objects.create_user(username='user', password='user123')
        token_response = self.client.post(
            reverse('auth_login'),
            {'username': 'user', 'password': 'user123'},
            format='json',
        )
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token_response.data["access"]}')
        response = self.client.get('/api/categories/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('error', response.data)

    def test_admin_can_login_via_auth_login_endpoint(self):
        response = self.client.post(
            reverse('auth_login'),
            {'username': 'admin', 'password': 'admin123'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

    def test_refresh_token_endpoint(self):
        login_response = self.client.post(
            reverse('auth_login'),
            {'username': 'admin', 'password': 'admin123'},
            format='json',
        )
        response = self.client.post(
            reverse('auth_refresh'),
            {'refresh': login_response.data['refresh']},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)

    def test_logout_requires_authentication(self):
        response = self.client.post(reverse('auth_logout'))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_authenticated_logout_succeeds(self):
        login_response = self.client.post(
            reverse('auth_login'),
            {'username': 'admin', 'password': 'admin123'},
            format='json',
        )
        self.client.credentials(
            HTTP_AUTHORIZATION=f'Bearer {login_response.data["access"]}',
        )
        response = self.client.post(reverse('auth_logout'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_refresh_after_invalid_access_token(self):
        login_response = self.client.post(
            reverse('auth_login'),
            {'username': 'admin', 'password': 'admin123'},
            format='json',
        )
        refresh_response = self.client.post(
            reverse('auth_refresh'),
            {'refresh': login_response.data['refresh']},
            format='json',
        )
        self.assertEqual(refresh_response.status_code, status.HTTP_200_OK)
        self.client.credentials(
            HTTP_AUTHORIZATION=f'Bearer {refresh_response.data["access"]}',
        )
        response = self.client.get('/api/categories/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class CategoryAPITests(AuthenticatedAPITestCase):
    def test_create_and_list_categories(self):
        response = self.client.post(
            '/api/categories/',
            {'name': 'Office', 'description': 'Office supplies'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        response = self.client.get('/api/categories/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_create_category_requires_name(self):
        response = self.client.post('/api/categories/', {'name': '   '}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
        self.assertIn('details', response.data)


class ProductAPITests(AuthenticatedAPITestCase):
    def test_create_product_with_unique_sku(self):
        response = self.client.post(
            '/api/products/',
            {
                'name': 'Laptop',
                'sku': 'LAP-001',
                'category': self.category.id,
                'description': 'Business laptop',
                'unit_price': '999.99',
                'minimum_stock_threshold': 5,
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['stock_quantity'], 0)
        self.assertEqual(response.data['category_detail']['name'], 'Electronics')

    def test_duplicate_sku_is_rejected(self):
        Product.objects.create(
            name='Mouse',
            sku='MOU-001',
            category=self.category,
            unit_price=Decimal('25.00'),
        )
        response = self.client.post(
            '/api/products/',
            {
                'name': 'Another Mouse',
                'sku': 'mou-001',
                'category': self.category.id,
                'unit_price': '20.00',
                'minimum_stock_threshold': 1,
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_negative_unit_price_is_rejected(self):
        response = self.client.post(
            '/api/products/',
            {
                'name': 'Invalid',
                'sku': 'INV-001',
                'category': self.category.id,
                'unit_price': '-1.00',
                'minimum_stock_threshold': 0,
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class LowStockAPITests(AuthenticatedAPITestCase):
    def test_low_stock_endpoint_returns_products_at_or_below_threshold(self):
        Product.objects.create(
            name='Low Item',
            sku='LOW-001',
            category=self.category,
            unit_price=Decimal('10.00'),
            stock_quantity=2,
            minimum_stock_threshold=5,
        )
        Product.objects.create(
            name='Healthy Item',
            sku='OK-001',
            category=self.category,
            unit_price=Decimal('10.00'),
            stock_quantity=20,
            minimum_stock_threshold=5,
        )
        response = self.client.get('/api/products/low-stock/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['sku'], 'LOW-001')


class DashboardStatsAPITests(AuthenticatedAPITestCase):
    def setUp(self):
        super().setUp()
        self.product = Product.objects.create(
            name='Keyboard',
            sku='KEY-001',
            category=self.category,
            unit_price=Decimal('50.00'),
            stock_quantity=10,
            minimum_stock_threshold=5,
        )

    def test_dashboard_stats_aggregation(self):
        self.client.post(
            '/api/transactions/',
            {
                'product': self.product.id,
                'transaction_type': InventoryTransaction.TransactionType.IN,
                'quantity': 10,
            },
            format='json',
        )
        self.client.post(
            '/api/transactions/',
            {
                'product': self.product.id,
                'transaction_type': InventoryTransaction.TransactionType.OUT,
                'quantity': 6,
            },
            format='json',
        )
        response = self.client.get('/api/dashboard/stats/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_products'], 1)
        self.assertEqual(response.data['low_stock_count'], 1)
        self.assertEqual(response.data['total_stock_value'], '200.00')
        self.assertEqual(len(response.data['recent_transactions']), 2)


class InventoryTransactionAPITests(AuthenticatedAPITestCase):
    def setUp(self):
        super().setUp()
        self.product = Product.objects.create(
            name='Keyboard',
            sku='KEY-001',
            category=self.category,
            unit_price=Decimal('50.00'),
        )

    def test_in_transaction_increases_stock(self):
        response = self.client.post(
            '/api/transactions/',
            {
                'product': self.product.id,
                'transaction_type': InventoryTransaction.TransactionType.IN,
                'quantity': 10,
                'notes': 'Initial stock',
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_quantity, 10)

    def test_out_transaction_decreases_stock(self):
        self.client.post(
            '/api/transactions/',
            {
                'product': self.product.id,
                'transaction_type': InventoryTransaction.TransactionType.IN,
                'quantity': 10,
            },
            format='json',
        )
        response = self.client.post(
            '/api/transactions/',
            {
                'product': self.product.id,
                'transaction_type': InventoryTransaction.TransactionType.OUT,
                'quantity': 4,
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_quantity, 6)

    def test_out_transaction_prevents_negative_stock(self):
        response = self.client.post(
            '/api/transactions/',
            {
                'product': self.product.id,
                'transaction_type': InventoryTransaction.TransactionType.OUT,
                'quantity': 1,
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
        self.assertIn('details', response.data)
        self.assertIn('quantity', response.data['details'])

    def test_out_transaction_exceeding_available_stock_is_rejected(self):
        self.client.post(
            '/api/transactions/',
            {
                'product': self.product.id,
                'transaction_type': InventoryTransaction.TransactionType.IN,
                'quantity': 5,
            },
            format='json',
        )
        first = self.client.post(
            '/api/transactions/',
            {
                'product': self.product.id,
                'transaction_type': InventoryTransaction.TransactionType.OUT,
                'quantity': 3,
            },
            format='json',
        )
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        second = self.client.post(
            '/api/transactions/',
            {
                'product': self.product.id,
                'transaction_type': InventoryTransaction.TransactionType.OUT,
                'quantity': 3,
            },
            format='json',
        )
        self.assertEqual(second.status_code, status.HTTP_400_BAD_REQUEST)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_quantity, 2)

    def test_adjust_transaction_sets_stock(self):
        self.client.post(
            '/api/transactions/',
            {
                'product': self.product.id,
                'transaction_type': InventoryTransaction.TransactionType.IN,
                'quantity': 10,
            },
            format='json',
        )
        response = self.client.post(
            '/api/transactions/',
            {
                'product': self.product.id,
                'transaction_type': InventoryTransaction.TransactionType.ADJUST,
                'quantity': 7,
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_quantity, 7)

    def test_delete_transaction_recalculates_stock(self):
        self.client.post(
            '/api/transactions/',
            {
                'product': self.product.id,
                'transaction_type': InventoryTransaction.TransactionType.IN,
                'quantity': 10,
            },
            format='json',
        )
        out_response = self.client.post(
            '/api/transactions/',
            {
                'product': self.product.id,
                'transaction_type': InventoryTransaction.TransactionType.OUT,
                'quantity': 3,
            },
            format='json',
        )
        delete_response = self.client.delete(f'/api/transactions/{out_response.data["id"]}/')
        self.assertEqual(delete_response.status_code, status.HTTP_204_NO_CONTENT)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_quantity, 10)

    def test_update_transaction_recalculates_stock(self):
        in_response = self.client.post(
            '/api/transactions/',
            {
                'product': self.product.id,
                'transaction_type': InventoryTransaction.TransactionType.IN,
                'quantity': 10,
            },
            format='json',
        )
        update_response = self.client.patch(
            f'/api/transactions/{in_response.data["id"]}/',
            {'quantity': 15},
            format='json',
        )
        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_quantity, 15)

    def test_delete_in_transaction_with_dependent_out_is_rejected(self):
        in_response = self.client.post(
            '/api/transactions/',
            {
                'product': self.product.id,
                'transaction_type': InventoryTransaction.TransactionType.IN,
                'quantity': 10,
            },
            format='json',
        )
        self.client.post(
            '/api/transactions/',
            {
                'product': self.product.id,
                'transaction_type': InventoryTransaction.TransactionType.OUT,
                'quantity': 3,
            },
            format='json',
        )
        delete_response = self.client.delete(f'/api/transactions/{in_response.data["id"]}/')
        self.assertEqual(delete_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(
            InventoryTransaction.objects.filter(pk=in_response.data['id']).exists()
        )
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_quantity, 7)

    def test_service_layer_rejects_out_transaction_beyond_available_stock(self):
        InventoryTransaction.objects.create(
            product=self.product,
            transaction_type=InventoryTransaction.TransactionType.IN,
            quantity=5,
        )
        with self.assertRaises(StockError):
            validate_transaction_change(
                self.product,
                InventoryTransaction.TransactionType.OUT,
                6,
            )


class ExceptionHandlerTests(APITestCase):
    @override_settings(DEBUG=False)
    def test_unhandled_exception_returns_generic_error_in_production(self):
        with patch('inventory.views.CategoryViewSet.list', side_effect=RuntimeError('boom')):
            User.objects.create_superuser(username='admin', password='admin123')
            login = self.client.post(
                reverse('auth_login'),
                {'username': 'admin', 'password': 'admin123'},
                format='json',
            )
            self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {login.data["access"]}')
            response = self.client.get('/api/categories/')
        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertEqual(response.data['error'], 'An unexpected server error occurred.')
        self.assertEqual(response.data['details'], {})
