# Generated manually: drop unique constraint on activity_link (H1).

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0016_user_is_content_manager'),
    ]

    operations = [
        migrations.AlterField(
            model_name='memberactivityrequest',
            name='activity_link',
            field=models.URLField(verbose_name='رابط النشاط (سترافا أو غيره)'),
        ),
    ]
