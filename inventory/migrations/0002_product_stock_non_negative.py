from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0001_initial'),
    ]

    operations = [
        migrations.AddConstraint(
            model_name='product',
            constraint=models.CheckConstraint(
                check=models.Q(stock_quantity__gte=0),
                name='product_stock_non_negative',
            ),
        ),
    ]
