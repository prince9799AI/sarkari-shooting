from django.db import models


class SiteSettings(models.Model):
    """Global site settings - logo, contact info, social links. Singleton model."""
    site_name = models.CharField(max_length=100, default="Sarkari Shooting")
    logo = models.ImageField(upload_to="site/", blank=True, null=True)
    favicon = models.ImageField(upload_to="site/", blank=True, null=True)
    # Contact
    phone_whatsapp = models.CharField(max_length=20, blank=True)
    studio_address = models.TextField(blank=True)
    email = models.EmailField(blank=True)
    working_hours = models.CharField(max_length=200, blank=True)
    # Social
    whatsapp_url = models.URLField(blank=True)
    instagram_url = models.URLField(blank=True)
    facebook_url = models.URLField(blank=True)
    copyright_text = models.CharField(max_length=200, default="© 2026 — Sarkari Shooting Cinematography. All rights reserved.")

    class Meta:
        verbose_name = "Site Settings"
        verbose_name_plural = "Site Settings"

    def __str__(self):
        return self.site_name


class HeroSlide(models.Model):
    """Hero section slideshow slides."""
    image = models.ImageField(upload_to="hero/", blank=True, null=True)
    location = models.CharField(max_length=100)
    date = models.CharField(max_length=50)
    title = models.CharField(max_length=200)
    description = models.TextField()
    link_text = models.CharField(max_length=50, default="View Portfolio")
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return self.title


class BrandStatement(models.Model):
    """Brand headline and tagline section."""
    headline = models.CharField(max_length=300)
    tagline = models.CharField(max_length=200)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return self.headline[:50]


class Service(models.Model):
    """Creative services offered."""
    icon = models.ImageField(upload_to="services/", blank=True, null=True)
    tag = models.CharField(max_length=100)
    name = models.CharField(max_length=150)
    description = models.TextField()
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return self.name


class PortfolioCategory(models.Model):
    """Portfolio categories (Weddings, Pre-Wedding, Events, etc.)."""
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order"]
        verbose_name_plural = "Portfolio categories"

    def __str__(self):
        return self.name


class PortfolioItem(models.Model):
    """Portfolio gallery items."""
    category = models.ForeignKey(PortfolioCategory, on_delete=models.CASCADE, related_name="items")
    image = models.ImageField(upload_to="portfolio/", blank=True, null=True, help_text="Main/thumbnail image")
    title = models.CharField(max_length=200)
    meta = models.CharField(max_length=150, help_text="e.g. Dec 2025 · Udaipur")
    description = models.TextField(blank=True, help_text="Film story / description")
    venue = models.CharField(max_length=200, blank=True, help_text="Venue name (e.g. Hacienda San Pedro Ochil)")
    tags = models.CharField(max_length=300, blank=True, help_text="Comma-separated tags (e.g. Gay Wedding, Mexico, LGBTQ)")
    testimonial_text = models.TextField(blank=True, help_text="Client testimonial quote")
    testimonial_author = models.CharField(max_length=200, blank=True, help_text="Testimonial author name")
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return self.title


class PortfolioItemImage(models.Model):
    """Additional images for a portfolio item (gallery)."""
    portfolio_item = models.ForeignKey(PortfolioItem, on_delete=models.CASCADE, related_name="gallery_images")
    image = models.ImageField(upload_to="portfolio/gallery/")
    caption = models.CharField(max_length=200, blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order"]
        verbose_name = "Portfolio gallery image"
        verbose_name_plural = "Portfolio gallery images"

    def __str__(self):
        return f"Image {self.order} for {self.portfolio_item.title}"


class PortfolioItemVideo(models.Model):
    """Additional videos for a portfolio item."""
    portfolio_item = models.ForeignKey(PortfolioItem, on_delete=models.CASCADE, related_name="gallery_videos")
    video = models.FileField(upload_to="portfolio/videos/")
    caption = models.CharField(max_length=200, blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order"]
        verbose_name = "Portfolio gallery video"
        verbose_name_plural = "Portfolio gallery videos"

    def __str__(self):
        return f"Video {self.order} for {self.portfolio_item.title}"


class Quote(models.Model):
    """Quote strip section."""
    text = models.TextField()
    author = models.CharField(max_length=100)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return self.text[:50]


class ProcessStep(models.Model):
    """Our creative process steps."""
    step_number = models.CharField(max_length=10, help_text="e.g. 01, 02")
    title = models.CharField(max_length=100)
    description = models.TextField()
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return self.title


class Testimonial(models.Model):
    """Client reviews/testimonials."""
    text = models.TextField()
    author_name = models.CharField(max_length=150)
    author_title = models.CharField(max_length=150, help_text="e.g. Wedding Client · Udaipur")
    image = models.ImageField(upload_to="testimonials/", blank=True, null=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return self.author_name


class Stat(models.Model):
    """Stats counter section."""
    count = models.PositiveIntegerField()
    suffix = models.CharField(max_length=10, default="+")
    label = models.CharField(max_length=100)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return f"{self.count}{self.suffix} {self.label}"


class CTABanner(models.Model):
    """CTA banner section."""
    image = models.ImageField(upload_to="cta/", blank=True, null=True)
    heading = models.CharField(max_length=200)
    button_text = models.CharField(max_length=50, default="Book a Session")
    button_link = models.CharField(max_length=200, blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return self.heading


class SiteSection(models.Model):
    """Section labels (eyebrow labels and headings) for sections."""
    section_key = models.SlugField(unique=True, help_text="e.g. services, portfolio, process")
    eyebrow_label = models.CharField(max_length=100)
    heading = models.CharField(max_length=200)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return self.section_key


class Enquiry(models.Model):
    """Contact form enquiries."""
    name = models.CharField(max_length=150)
    email = models.EmailField()
    phone = models.CharField(max_length=20, blank=True)
    event_date = models.CharField(max_length=100, blank=True)
    event_location = models.CharField(max_length=200, blank=True)
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]
        verbose_name_plural = "Enquiries"

    def __str__(self):
        return f"{self.name} - {self.created_at.strftime('%Y-%m-%d')}"
