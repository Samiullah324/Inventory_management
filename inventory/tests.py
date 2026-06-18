from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db.models.deletion import ProtectedError
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from inventory.models import Category, InventoryTransaction, Product

User = get_user_model()


class AuthenticatedAPITestCase(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(
            username='admin',
            email='admin@example.com',
            password='admin123',
        )
        response = self.client.post(
            reverse('token_obtain_pair'),
            {'username': 'admin', 'password': 'admin123'},
            format='json',
        )
        self.token = response.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')
        self.category = Category.objects.create(name='Electronics', description='Gadgets')


class AuthenticationTests(APITestCase):
    def setUp(self):
        User.objects.create_superuser(username='admin', password='admin123')

    def test_unauthenticated_request_is_rejected(self):
        response = self.client.get('/api/categories/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_non_admin_user_is_rejected(self):
        User.objects.create_user(username='user', password='user123')
        token_response = self.client.post(
            reverse('token_obtain_pair'),
            {'username': 'user', 'password': 'user123'},
            format='json',
        )
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token_response.data["access"]}')
        response = self.client.get('/api/categories/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_obtain_token(self):
        response = self.client.post(
            reverse('token_obtain_pair'),
            {'username': 'admin', 'password': 'admin123'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)


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


class DashboardAPITests(AuthenticatedAPITestCase):
    def test_dashboard_stats_aggregation(self):
        Product.objects.create(
            name='Low Stock Item',
            sku='LOW-001',
            category=self.category,
            unit_price=Decimal('10.00'),
            stock_quantity=2,
            minimum_stock_threshold=5,
        )
        product = Product.objects.create(
            name='Healthy Item',
            sku='OK-001',
            category=self.category,
            unit_price=Decimal('20.00'),
            stock_quantity=10,
            minimum_stock_threshold=3,
        )
        InventoryTransaction.objects.create(
            product=product,
            transaction_type=InventoryTransaction.TransactionType.IN,
            quantity=10,
            notes='Restock',
        )

        response = self.client.get('/api/dashboard/stats/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_products'], 2)
        self.assertEqual(response.data['total_categories'], 1)
        self.assertEqual(response.data['total_stock_units'], 12)
        self.assertEqual(len(response.data['low_stock_products']), 1)
        self.assertEqual(response.data['low_stock_products'][0]['sku'], 'LOW-001')
        self.assertEqual(len(response.data['recent_transactions']), 1)

    def test_dashboard_empty_state_returns_zero_defaults(self):
        InventoryTransaction.objects.all().delete()
        Product.objects.all().delete()
        Category.objects.all().delete()

        response = self.client.get('/api/dashboard/stats/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_products'], 0)
        self.assertEqual(response.data['total_categories'], 0)
        self.assertEqual(response.data['total_stock_units'], 0)
        self.assertEqual(response.data['low_stock_products'], [])
        self.assertEqual(response.data['recent_transactions'], [])
        self.assertEqual(response.data['recent_transactions_limit'], 10)

    def test_dashboard_respects_transaction_limit_query_param(self):
        product = Product.objects.create(
            name='Widget',
            sku='WID-001',
            category=self.category,
            unit_price=Decimal('5.00'),
        )
        for index in range(15):
            InventoryTransaction.objects.create(
                product=product,
                transaction_type=InventoryTransaction.TransactionType.IN,
                quantity=1,
                notes=f'Batch {index}',
            )

        response = self.client.get('/api/dashboard/stats/?limit=5')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['recent_transactions']), 5)
        self.assertEqual(response.data['recent_transactions_limit'], 5)


class CorsConfigurationTests(APITestCase):
    def setUp(self):
        User.objects.create_superuser(username='admin', password='admin123')
        token_response = self.client.post(
            reverse('token_obtain_pair'),
            {'username': 'admin', 'password': 'admin123'},
            format='json',
        )
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token_response.data["access"]}')

    def test_cors_allows_configured_frontend_origin(self):
        response = self.client.get(
            '/api/categories/',
            HTTP_ORIGIN='http://localhost:5173',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response['Access-Control-Allow-Origin'],
            'http://localhost:5173',
        )


class CategoryProductRelationshipTests(AuthenticatedAPITestCase):
    def test_category_lists_related_products(self):
        Product.objects.create(
            name='Cable',
            sku='CAB-001',
            category=self.category,
            unit_price=Decimal('5.00'),
        )
        response = self.client.get('/api/products/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]['category'], self.category.id)
        self.assertEqual(response.data[0]['category_name'], self.category.name)

    def test_category_with_products_cannot_be_deleted(self):
        Product.objects.create(
            name='Cable',
            sku='CAB-001',
            category=self.category,
            unit_price=Decimal('5.00'),
        )
        with self.assertRaises(ProtectedError):
            self.category.delete()
