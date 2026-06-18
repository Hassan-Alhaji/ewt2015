import sys
from io import BytesIO
from datetime import date
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.utils import timezone
from PIL import Image
from django.core.files.uploadedfile import InMemoryUploadedFile

class UserManager(BaseUserManager):
    def create_user(self, mobile, password=None, **extra_fields):
        if not mobile:
            raise ValueError('يجب توفير رقم الجوال')
        extra_fields.setdefault('is_active', True)
        user = self.model(mobile=mobile, **extra_fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, mobile, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self.create_user(mobile, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    mobile = models.CharField(max_length=20, unique=True, verbose_name="رقم الجوال")
    is_staff = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    is_approved = models.BooleanField(default=False, verbose_name="مفعل من الإدارة")
    is_reviewer = models.BooleanField(default=False, verbose_name="مُراجع أنشطة")
    is_content_manager = models.BooleanField(default=False, verbose_name="مدير المحتوى")
    date_joined = models.DateTimeField(default=timezone.now)

    objects = UserManager()

    USERNAME_FIELD = 'mobile'
    REQUIRED_FIELDS = []

    class Meta:
        verbose_name = "مستخدم"
        verbose_name_plural = "المستخدمون"

    def __str__(self):
        return self.mobile


class Category(models.Model):
    name = models.CharField(max_length=100, verbose_name="اسم الفئة")
    code = models.CharField(max_length=50, unique=True, verbose_name="رمز الفئة")
    description = models.TextField(blank=True, null=True, verbose_name="الوصف")

    class Meta:
        verbose_name = "فئة"
        verbose_name_plural = "الفئات"

    def __str__(self):
        return self.name


class UserProfile(models.Model):
    GENDER_CHOICES = [
        ('male', 'ذكر'),
        ('female', 'أنثى'),
    ]
    ACTIVITY_CHOICES = [
        ('walk', 'مشي'),
        ('run', 'جري'),
        ('both', 'الاثنين'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    name = models.CharField(max_length=150, verbose_name="الاسم الكامل")
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True, verbose_name="الصورة الشخصية")
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, verbose_name="الجنس")
    birth_date = models.DateField(null=True, blank=True, verbose_name="تاريخ الميلاد")
    city = models.CharField(max_length=100, verbose_name="المدينة")
    email = models.EmailField(blank=True, null=True, verbose_name="البريد الإلكتروني")
    
    # Secret health notes (only for owner and admin)
    height = models.FloatField(null=True, blank=True, verbose_name="الطول")
    weight = models.FloatField(null=True, blank=True, verbose_name="الوزن")
    health_notes = models.TextField(blank=True, null=True, verbose_name="الملاحظات الصحية")
    
    is_disabled = models.BooleanField(default=False, verbose_name="من ذوي الهمم")
    preferred_activity = models.CharField(max_length=20, choices=ACTIVITY_CHOICES, default='walk', verbose_name="النشاط المفضل")
    
    # Phase 2: Category and progression fields
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name='profiles', verbose_name="الفئة")
    is_category_manual = models.BooleanField(default=False, verbose_name="تصنيف يدوي من الأدمن")
    total_km = models.DecimalField(max_digits=8, decimal_places=2, default=0.00, verbose_name="مجموع الكيلومترات")
    points = models.IntegerField(default=0, verbose_name="النقاط")
    streak = models.IntegerField(default=0, verbose_name="أيام الاستمرار المتتالية")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "ملف العضو"
        verbose_name_plural = "ملفات الأعضاء"

    def __str__(self):
        return self.name

    @property
    def age(self):
        if not self.birth_date:
            return None
        today = date.today()
        return today.year - self.birth_date.year - ((today.month, today.day) < (self.birth_date.month, self.birth_date.day))

    def save(self, *args, **kwargs):
        # Phase 2: Automatic category classification
        if not self.is_category_manual:
            try:
                special_needs = Category.objects.filter(code='special_needs').first()
                seniors = Category.objects.filter(code='seniors').first()
                ladies = Category.objects.filter(code='ladies').first()
                youth = Category.objects.filter(code='youth').first()
                
                assigned_category = None
                
                if self.is_disabled and special_needs:
                    assigned_category = special_needs
                elif self.birth_date:
                    birth_date = self.birth_date
                    if isinstance(birth_date, str):
                        from datetime import datetime
                        birth_date = datetime.strptime(birth_date, "%Y-%m-%d").date()
                    # Calculate age
                    today = date.today()
                    age = today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
                    if age >= 60 and seniors:
                        assigned_category = seniors
                
                # If not assigned yet
                if not assigned_category:
                    if self.gender == 'female' and ladies:
                        assigned_category = ladies
                    elif youth:
                        assigned_category = youth
                
                self.category = assigned_category
            except Exception as e:
                # Occurs if database tables don't exist yet during migrations
                pass

        # Image compression before save
        if self.avatar:
            try:
                # Open the image file
                img = Image.open(self.avatar)
                # Convert to RGB mode if not already
                if img.mode != 'RGB':
                    img = img.convert('RGB')
                
                # Resize keeping aspect ratio
                max_size = (800, 800)
                img.thumbnail(max_size, Image.Resampling.LANCZOS)
                
                # Save compressed to BytesIO
                output = BytesIO()
                img.save(output, format='JPEG', quality=80)
                output.seek(0)
                
                # Reassign file back to field
                self.avatar = InMemoryUploadedFile(
                    output, 
                    'ImageField', 
                    f"{self.user.mobile}_avatar.jpg", 
                    'image/jpeg', 
                    sys.getsizeof(output), 
                    None
                )
            except Exception as e:
                # If compression fails, save original
                print(f"Error compressing avatar image: {e}")
                
        super().save(*args, **kwargs)


class OTPLogin(models.Model):
    mobile = models.CharField(max_length=20, verbose_name="رقم الجوال")
    code = models.CharField(max_length=6, verbose_name="رمز التحقق")
    created_at = models.DateTimeField(auto_now_add=True)
    is_used = models.BooleanField(default=False, verbose_name="تم الاستخدام")
    expires_at = models.DateTimeField(verbose_name="تاريخ الانتهاء")

    class Meta:
        verbose_name = "رمز التحقق OTP"
        verbose_name_plural = "رموز التحقق OTP"

    def __str__(self):
        return f"{self.mobile} - {self.code}"

    @property
    def is_expired(self):
        return timezone.now() > self.expires_at


class PointsTransaction(models.Model):
    TRANSACTION_TYPES = [
        ('walk_activity', 'نشاط مشي معتمد'),
        ('event_attendance', 'حضور فعالية'),
        ('event_distance', 'مسافة من فعالية'),
        ('admin_adjustment', 'تعديل يدوي من الإدارة'),
        ('coupon_redemption', 'استبدال كوبون خصم'),
        ('most_improved', 'الأكثر تطوراً'),
        ('monthly_goal', 'تحقيق هدف الشهر'),
        ('monthly_rank', 'مركز شهري'),
        ('content_creation', 'صناعة محتوى'),
        ('streak_bonus', 'إنجاز استمرارية'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='points_transactions', verbose_name="المستخدم")
    amount = models.IntegerField(verbose_name="عدد النقاط")
    km = models.DecimalField(max_digits=7, decimal_places=2, default=0, verbose_name="الكيلومترات")
    transaction_type = models.CharField(max_length=30, choices=TRANSACTION_TYPES, verbose_name="نوع الحركة")
    description = models.CharField(max_length=255, verbose_name="الوصف/السبب")
    
    # New Fields for Master PRD Compliance
    season_year = models.IntegerField(default=timezone.now().year, verbose_name="سنة الاحتساب")
    applied_rate = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True, verbose_name="المعدل المطبق وقت المنح")
    source_type = models.CharField(max_length=50, null=True, blank=True, verbose_name="نوع المصدر")
    source_id = models.IntegerField(null=True, blank=True, verbose_name="معرف المصدر")

    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_transactions', verbose_name="بواسطة الأدمن")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="تاريخ الحركة")

    class Meta:
        verbose_name = "حركة نقاط"
        verbose_name_plural = "سجل حركات النقاط"

    def __str__(self):
        return f"{self.user.mobile} : {self.amount} ({self.transaction_type})"


from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.db.models import Sum

@receiver([post_save, post_delete], sender=PointsTransaction)
def update_user_profile_points(sender, instance, **kwargs):
    user = instance.user
    try:
        profile = user.profile
        total_points = user.points_transactions.aggregate(total=Sum('amount'))['total'] or 0
        profile.points = total_points
        profile.save(update_fields=['points'])
    except UserProfile.DoesNotExist:
        pass


class EventLocation(models.Model):
    name_ar = models.CharField(max_length=255, verbose_name="اسم الموقع بالعربية")
    name_en = models.CharField(max_length=255, verbose_name="اسم الموقع بالإنجليزية")
    location_url = models.URLField(verbose_name="رابط الخريطة")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="تاريخ الإضافة")

    class Meta:
        verbose_name = "موقع جاهز"
        verbose_name_plural = "مواقع الفعاليات الجاهزة"

    def __str__(self):
        return f"{self.name_ar} ({self.name_en})"


class Event(models.Model):
    name_ar = models.CharField(max_length=200, verbose_name="اسم الفعالية بالعربية")
    name_en = models.CharField(max_length=200, verbose_name="اسم الفعالية بالإنجليزية")
    description_ar = models.TextField(blank=True, null=True, verbose_name="وصف الفعالية بالعربية")
    description_en = models.TextField(blank=True, null=True, verbose_name="وصف الفعالية بالإنجليزية")
    points = models.IntegerField(default=0, verbose_name="نقاط الحضور")
    km = models.DecimalField(max_digits=6, decimal_places=2, default=0.00, verbose_name="مسافة الفعالية (كم)")
    image = models.ImageField(upload_to='events/', null=True, blank=True, verbose_name="صورة الفعالية")
    event_date = models.DateField(null=True, blank=True, verbose_name="تاريخ الفعالية")
    event_time = models.TimeField(null=True, blank=True, verbose_name="وقت الفعالية")
    location_name = models.CharField(max_length=255, null=True, blank=True, verbose_name="اسم الموقع")
    location_url = models.URLField(null=True, blank=True, verbose_name="رابط الموقع (Google Maps)")
    is_active = models.BooleanField(default=True, verbose_name="مفتوحة لتسجيل الحضور")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="تاريخ الإنشاء")

    class Meta:
        verbose_name = "فعالية"
        verbose_name_plural = "الفعاليات"

    def __str__(self):
        return self.name_ar

    @property
    def is_expired(self):
        if not self.event_date:
            return False
        from django.utils import timezone
        today = timezone.localdate()
        if self.event_date < today:
            return True
        if self.event_date == today and self.event_time:
            now_time = timezone.localtime().time()
            if self.event_time < now_time:
                return True
        return False

    def save(self, *args, **kwargs):
        # Image compression before save
        if self.image:
            try:
                img = Image.open(self.image)
                if img.mode != 'RGB':
                    img = img.convert('RGB')
                
                max_size = (1200, 800)
                img.thumbnail(max_size, Image.Resampling.LANCZOS)
                
                output = BytesIO()
                img.save(output, format='JPEG', quality=80)
                output.seek(0)
                
                import uuid
                filename = f"event_{uuid.uuid4().hex[:8]}.jpg"
                
                self.image = InMemoryUploadedFile(
                    output, 
                    'ImageField', 
                    filename, 
                    'image/jpeg', 
                    sys.getsizeof(output), 
                    None
                )
            except Exception as e:
                print(f"Error compressing event image: {e}")
        super().save(*args, **kwargs)


class EventAttendance(models.Model):
    STATUS_CHOICES = [
        ('pending', 'قيد الانتظار'),
        ('approved', 'تمت الموافقة'),
        ('rejected', 'مرفوض'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='attendances', verbose_name="المستخدم")
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='attendances', verbose_name="الفعالية")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending', verbose_name="حالة الحضور")
    registered_at = models.DateTimeField(auto_now_add=True, verbose_name="تاريخ طلب الحضور")
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_attendances', verbose_name="تمت الموافقة بواسطة")
    approved_at = models.DateTimeField(null=True, blank=True, verbose_name="تاريخ الموافقة")

    class Meta:
        verbose_name = "حضور فعالية"
        verbose_name_plural = "سجل حضور الفعاليات"
        unique_together = ('user', 'event')

    def __str__(self):
        return f"{self.user.mobile} - {self.event.name_ar} ({self.status})"

class MemberActivityRequest(models.Model):
    STATUS_CHOICES = [
        ('pending', 'قيد المراجعة'),
        ('approved', 'مقبول'),
        ('rejected', 'مرفوض'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='activity_requests', verbose_name="العضو")
    activity_name = models.CharField(max_length=200, verbose_name="اسم النشاط")
    activity_link = models.URLField(verbose_name="رابط النشاط (سترافا أو غيره)")
    claimed_km = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True, verbose_name="المسافة المقطوعة تقريباً (كم)")
    
    # Admin review fields
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending', verbose_name="حالة الطلب")
    approved_km = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True, verbose_name="المسافة المعتمدة")
    approved_points = models.IntegerField(null=True, blank=True, verbose_name="النقاط المعتمدة")
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_activities', verbose_name="بواسطة الإداري")
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="تاريخ الرفع")
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "طلب نشاط حر"
        verbose_name_plural = "طلبات الأنشطة الحرة"

    def __str__(self):
        return f"{self.user.mobile} - {self.activity_name} ({self.status})"

class PointsSettings(models.Model):
    # Singleton Model to hold points configuration
    annual_goal_km = models.IntegerField(default=100000, verbose_name="الهدف السنوي للفريق (كم)")
    km_points_rate = models.DecimalField(max_digits=5, decimal_places=2, default=1.00, verbose_name="نقاط الكيلومتر الواحد")
    monthly_goal_points = models.IntegerField(default=50, verbose_name="نقاط تحقيق الهدف الشهري")
    rank_1_points = models.IntegerField(default=100, verbose_name="نقاط المركز الأول")
    rank_2_points = models.IntegerField(default=75, verbose_name="نقاط المركز الثاني")
    rank_3_points = models.IntegerField(default=50, verbose_name="نقاط المركز الثالث")
    most_improved_points = models.IntegerField(default=30, verbose_name="نقاط الأكثر تطوراً")
    content_points = models.IntegerField(default=20, verbose_name="نقاط المحتوى المعتمد")
    inspiring_story_points = models.IntegerField(default=50, verbose_name="نقاط القصة الملهمة")
    streak_7_points = models.IntegerField(default=15, verbose_name="نقاط استمرارية 7 أيام")
    streak_30_points = models.IntegerField(default=50, verbose_name="نقاط استمرارية 30 يوم")
    interaction_points = models.IntegerField(default=1, verbose_name="نقاط التفاعل")
    interaction_daily_cap = models.IntegerField(default=5, verbose_name="السقف اليومي لنقاط التفاعل")

    class Meta:
        verbose_name = "إعدادات النقاط"
        verbose_name_plural = "إعدادات النقاط"

    def save(self, *args, **kwargs):
        # Enforce Singleton
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def get_settings(cls):
        obj, created = cls.objects.get_or_create(pk=1)
        return obj

    def __str__(self):
        return "إعدادات نقاط فريق الشرقية للمشي"

class NewsPost(models.Model):
    STATUS_CHOICES = [
        ('pending', 'قيد المراجعة'),
        ('approved', 'مقبول ونُشر'),
        ('rejected', 'مرفوض'),
    ]
    NEWS_TYPE_CHOICES = [
        ('member', 'مشاركة عضو'),
        ('team', 'أخبار الفريق'),
    ]

    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='news_posts', verbose_name="الناشر")
    news_type = models.CharField(max_length=20, choices=NEWS_TYPE_CHOICES, default='member', verbose_name="نوع الخبر")
    title = models.CharField(max_length=255, verbose_name="عنوان الخبر/الإنجاز")
    content = models.TextField(verbose_name="محتوى الخبر")
    image = models.ImageField(upload_to='news/', null=True, blank=True, verbose_name="الصورة المرفقة")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending', verbose_name="حالة الخبر")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="تاريخ النشر")
    
    class Meta:
        verbose_name = "خبر / إنجاز"
        verbose_name_plural = "الأخبار والإنجازات"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} - {self.author.mobile}"

    def save(self, *args, **kwargs):
        if not self.pk:
            if getattr(self.author, 'is_content_manager', False) or getattr(self.author, 'is_staff', False) or getattr(self.author, 'is_superuser', False):
                self.news_type = 'team'
                if self.status == 'pending':
                    self.status = 'approved'

        # Image compression before save
        if self.image:
            try:
                img = Image.open(self.image)
                if img.mode != 'RGB':
                    img = img.convert('RGB')
                
                max_size = (1200, 800)
                img.thumbnail(max_size, Image.Resampling.LANCZOS)
                
                output = BytesIO()
                img.save(output, format='JPEG', quality=80)
                output.seek(0)
                
                import uuid
                filename = f"news_{uuid.uuid4().hex[:8]}.jpg"
                
                self.image = InMemoryUploadedFile(
                    output, 
                    'ImageField', 
                    filename, 
                    'image/jpeg', 
                    sys.getsizeof(output), 
                    None
                )
            except Exception as e:
                print(f"Error compressing news image: {e}")
        super().save(*args, **kwargs)

class NewsLike(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='news_likes')
    post = models.ForeignKey(NewsPost, on_delete=models.CASCADE, related_name='likes')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "إعجاب"
        verbose_name_plural = "الإعجابات"
        unique_together = ('user', 'post')

    def __str__(self):
        return f"{self.user.mobile} likes {self.post.title}"
