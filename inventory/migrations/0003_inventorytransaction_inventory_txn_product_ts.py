from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0002_product_stock_non_negative'),
    ]

    operations = [
        migrations.AddIndex(
            model_name='inventorytransaction',
            index=models.Index(fields=['product', 'timestamp'], name='inventory_txn_product_ts'),
        ),
    ]
