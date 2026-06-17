from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from inventory.auth_views import LoginRateThrottle, RefreshRateThrottle
from inventory.models import Category, InventoryTransaction, Product
from inventory.services import get_stock_status

User = get_user_model()


def auth_headers(user):
    token = str(RefreshToken.for_user(user).access_token)
    return {'HTTP_AUTHORIZATION': f'Bearer {token}'}


class AuthenticatedAPITestCase(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(
            username='admin',
            email='admin@example.com',
            password='admin123',
        )
        self.client.credentials(**auth_headers(self.admin))
        self.category = Category.objects.create(name='Electronics', description='Gadgets')

    def results(self, response):
        if isinstance(response.data, dict) and 'results' in response.data:
            return response.data['results']
        return response.data


class AuthenticationTests(APITestCase):
    def setUp(self):
        User.objects.create_superuser(username='admin', password='admin123')

    def test_unauthenticated_request_is_rejected(self):
        response = self.client.get('/api/categories/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_non_admin_user_is_rejected(self):
        user = User.objects.create_user(username='user', password='user123')
        self.client.credentials(**auth_headers(user))
        response = self.client.get('/api/categories/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_obtain_token_via_cookie_login(self):
        csrf = self.client.get('/api/auth/csrf/').data['csrfToken']
        response = self.client.post(
            reverse('token_obtain_pair'),
            {'username': 'admin', 'password': 'admin123'},
            format='json',
            HTTP_X_CSRFTOKEN=csrf,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['detail'], 'Login successful')
        self.assertIn('inventory_access', response.cookies)
        self.assertIn('inventory_refresh', response.cookies)


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
        self.assertEqual(len(self.results(response)), 2)


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
    def test_dashboard_returns_backend_aggregates(self):
        product = Product.objects.create(
            name='Monitor',
            sku='MON-001',
            category=self.category,
            unit_price=Decimal('200.00'),
            stock_quantity=0,
            minimum_stock_threshold=2,
        )
        Product.objects.create(
            name='Cable',
            sku='CAB-001',
            category=self.category,
            unit_price=Decimal('10.00'),
            stock_quantity=1,
            minimum_stock_threshold=5,
        )
        InventoryTransaction.objects.create(
            product=product,
            transaction_type=InventoryTransaction.TransactionType.IN,
            quantity=5,
            notes='Restock',
        )

        response = self.client.get('/api/dashboard/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_products'], 2)
        self.assertIn('recent_activity', response.data)


class ProductFilterAPITests(AuthenticatedAPITestCase):
    def setUp(self):
        super().setUp()
        Product.objects.create(
            name='Alpha Widget',
            sku='AW-001',
            category=self.category,
            unit_price=Decimal('10.00'),
            stock_quantity=0,
            minimum_stock_threshold=2,
        )
        Product.objects.create(
            name='Beta Gadget',
            sku='BG-001',
            category=self.category,
            unit_price=Decimal('20.00'),
            stock_quantity=3,
            minimum_stock_threshold=5,
        )

    def test_filter_products_by_stock_status_server_side(self):
        response = self.client.get('/api/products/?stock_status=low_stock')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = self.results(response)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['sku'], 'BG-001')
        self.assertEqual(results[0]['stock_status'], 'low_stock')

    def test_product_includes_backend_stock_status(self):
        response = self.client.get('/api/products/?sku=AW-001')
        product = self.results(response)[0]
        self.assertEqual(
            product['stock_status'],
            get_stock_status(Product.objects.get(sku='AW-001')),
        )


class TransactionFilterAPITests(AuthenticatedAPITestCase):
    def setUp(self):
        super().setUp()
        self.product = Product.objects.create(
            name='Filter Product',
            sku='FP-001',
            category=self.category,
            unit_price=Decimal('15.00'),
        )

    def test_filter_transactions_by_type(self):
        InventoryTransaction.objects.create(
            product=self.product,
            transaction_type=InventoryTransaction.TransactionType.IN,
            quantity=5,
        )
        InventoryTransaction.objects.create(
            product=self.product,
            transaction_type=InventoryTransaction.TransactionType.OUT,
            quantity=2,
        )
        response = self.client.get('/api/transactions/?transaction_type=OUT')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(self.results(response)), 1)
        self.assertEqual(self.results(response)[0]['transaction_type'], 'OUT')


class SecurityAPITests(APITestCase):
    def setUp(self):
        cache.clear()
        User.objects.create_superuser(username='admin', password='admin123')

    def test_csrf_token_endpoint_returns_token(self):
        response = self.client.get('/api/auth/csrf/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('csrfToken', response.data)

    def test_refresh_token_endpoint_is_rate_limited(self):
        cache.clear()
        csrf = self.client.get('/api/auth/csrf/').data['csrfToken']
        login = self.client.post(
            reverse('token_obtain_pair'),
            {'username': 'admin', 'password': 'admin123'},
            format='json',
            HTTP_X_CSRFTOKEN=csrf,
        )
        refresh_cookie = login.cookies['inventory_refresh'].value

        for _ in range(10):
            response = self.client.post(
                reverse('token_refresh'),
                {},
                format='json',
                HTTP_X_CSRFTOKEN=csrf,
                HTTP_COOKIE=f'inventory_refresh={refresh_cookie}; csrftoken={csrf}',
            )
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            refresh_cookie = response.cookies['inventory_refresh'].value

        throttled = self.client.post(
            reverse('token_refresh'),
            {},
            format='json',
            HTTP_X_CSRFTOKEN=csrf,
            HTTP_COOKIE=f'inventory_refresh={refresh_cookie}; csrftoken={csrf}',
        )
        self.assertEqual(throttled.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        cache.clear()

    def test_refresh_view_declares_rate_limiting(self):
        from inventory.auth_views import CookieTokenRefreshView

        self.assertIn(RefreshRateThrottle, CookieTokenRefreshView.throttle_classes)

    def test_login_endpoint_is_rate_limited(self):
        cache.clear()
        csrf = self.client.get('/api/auth/csrf/').data['csrfToken']

        for _ in range(5):
            response = self.client.post(
                reverse('token_obtain_pair'),
                {'username': 'admin', 'password': 'wrong-password'},
                format='json',
                HTTP_X_CSRFTOKEN=csrf,
            )
            self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        throttled = self.client.post(
            reverse('token_obtain_pair'),
            {'username': 'admin', 'password': 'wrong-password'},
            format='json',
            HTTP_X_CSRFTOKEN=csrf,
        )
        self.assertEqual(throttled.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        cache.clear()

    def test_login_view_declares_rate_limiting(self):
        from inventory.auth_views import CookieTokenObtainPairView

        self.assertIn(LoginRateThrottle, CookieTokenObtainPairView.throttle_classes)

    def test_logout_blacklists_refresh_token(self):
        csrf = self.client.get('/api/auth/csrf/').data['csrfToken']
        login = self.client.post(
            reverse('token_obtain_pair'),
            {'username': 'admin', 'password': 'admin123'},
            format='json',
            HTTP_X_CSRFTOKEN=csrf,
        )
        refresh_cookie = login.cookies['inventory_refresh'].value

        logout = self.client.post(
            reverse('logout'),
            {},
            format='json',
            HTTP_X_CSRFTOKEN=csrf,
            HTTP_COOKIE=f'inventory_refresh={refresh_cookie}; csrftoken={csrf}',
        )
        self.assertEqual(logout.status_code, status.HTTP_200_OK)

        refresh = self.client.post(
            reverse('token_refresh'),
            {},
            format='json',
            HTTP_X_CSRFTOKEN=csrf,
            HTTP_COOKIE=f'inventory_refresh={refresh_cookie}; csrftoken={csrf}',
        )
        self.assertEqual(refresh.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_refresh_rotation_blacklists_previous_refresh_token(self):
        csrf = self.client.get('/api/auth/csrf/').data['csrfToken']
        login = self.client.post(
            reverse('token_obtain_pair'),
            {'username': 'admin', 'password': 'admin123'},
            format='json',
            HTTP_X_CSRFTOKEN=csrf,
        )
        old_refresh_cookie = login.cookies['inventory_refresh'].value

        first_refresh = self.client.post(
            reverse('token_refresh'),
            {},
            format='json',
            HTTP_X_CSRFTOKEN=csrf,
            HTTP_COOKIE=f'inventory_refresh={old_refresh_cookie}; csrftoken={csrf}',
        )
        self.assertEqual(first_refresh.status_code, status.HTTP_200_OK)
        new_refresh_cookie = first_refresh.cookies['inventory_refresh'].value
        self.assertNotEqual(old_refresh_cookie, new_refresh_cookie)

        stale_refresh = self.client.post(
            reverse('token_refresh'),
            {},
            format='json',
            HTTP_X_CSRFTOKEN=csrf,
            HTTP_COOKIE=f'inventory_refresh={old_refresh_cookie}; csrftoken={csrf}',
        )
        self.assertEqual(stale_refresh.status_code, status.HTTP_401_UNAUTHORIZED)


class SetupAdminCommandTests(APITestCase):
    @override_settings(DEBUG=False)
    def test_setup_admin_rejects_default_password_when_debug_false(self):
        with self.assertRaises(CommandError):
            call_command('setup_admin')

    @override_settings(DEBUG=True)
    def test_setup_admin_allows_default_password_in_debug(self):
        call_command('setup_admin', verbosity=0)
        self.assertTrue(User.objects.filter(username='admin', is_superuser=True).exists())


class IntegrationFlowTests(AuthenticatedAPITestCase):
    def test_full_inventory_flow_updates_dashboard_and_stock(self):
        category_response = self.client.post(
            '/api/categories/',
            {'name': 'Warehouse', 'description': 'Main storage'},
            format='json',
        )
        self.assertEqual(category_response.status_code, status.HTTP_201_CREATED)
        category_id = category_response.data['id']

        product_response = self.client.post(
            '/api/products/',
            {
                'name': 'Pallet',
                'sku': 'PAL-001',
                'category': category_id,
                'unit_price': '12.50',
                'minimum_stock_threshold': 3,
            },
            format='json',
        )
        self.assertEqual(product_response.status_code, status.HTTP_201_CREATED)
        product_id = product_response.data['id']

        in_response = self.client.post(
            '/api/transactions/',
            {
                'product': product_id,
                'transaction_type': InventoryTransaction.TransactionType.IN,
                'quantity': 10,
            },
            format='json',
        )
        self.assertEqual(in_response.status_code, status.HTTP_201_CREATED)

        out_response = self.client.post(
            '/api/transactions/',
            {
                'product': product_id,
                'transaction_type': InventoryTransaction.TransactionType.OUT,
                'quantity': 4,
            },
            format='json',
        )
        self.assertEqual(out_response.status_code, status.HTTP_201_CREATED)

        product = Product.objects.get(pk=product_id)
        self.assertEqual(product.stock_quantity, 6)
        self.assertEqual(get_stock_status(product), 'in_stock')

        dashboard = self.client.get('/api/dashboard/').data
        self.assertEqual(dashboard['total_products'], 1)
        self.assertEqual(dashboard['total_stock'], 6)
        self.assertEqual(dashboard['low_stock_items'], 0)
        self.assertEqual(len(dashboard['recent_activity']), 2)

    def test_category_with_products_cannot_be_deleted(self):
        product = Product.objects.create(
            name='Protected Product',
            sku='PP-001',
            category=self.category,
            unit_price=Decimal('5.00'),
        )
        response = self.client.delete(f'/api/categories/{self.category.id}/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('detail', response.data)
        self.assertTrue(Category.objects.filter(pk=self.category.id).exists())
        self.assertTrue(Product.objects.filter(pk=product.id).exists())

    def test_dashboard_reflects_low_stock_after_adjustment(self):
        product = Product.objects.create(
            name='Low Stock Item',
            sku='LS-001',
            category=self.category,
            unit_price=Decimal('8.00'),
            minimum_stock_threshold=5,
        )
        self.client.post(
            '/api/transactions/',
            {
                'product': product.id,
                'transaction_type': InventoryTransaction.TransactionType.ADJUST,
                'quantity': 2,
            },
            format='json',
        )

        dashboard = self.client.get('/api/dashboard/').data
        self.assertEqual(dashboard['low_stock_items'], 1)
        self.assertEqual(dashboard['total_stock'], 2)
