from django import forms
from django.contrib import admin
from django.utils.html import format_html

admin.site.site_header = "Sarkari Shooting Admin"
admin.site.site_title = "Sarkari Shooting"
admin.site.index_title = "Content Management"
from .models import (
    VIDEO_EXTENSIONS,
    SiteSettings,
    HeroSlide,
    BrandStatement,
    Service,
    PortfolioCategory,
    PortfolioItem,
    Quote,
    ProcessStep,
    Testimonial,
    Stat,
    CTABanner,
    SiteSection,
    PricingPackage,
    InstagramPost,
    Enquiry,
)


class MediaFileFormMixin:
    """Validates that `image` is an image or video file. Used by models whose
    `image` field accepts both."""
    ALLOWED_EXTENSIONS = (".jpg", ".jpeg", ".png", ".webp", ".gif") + VIDEO_EXTENSIONS
    MEDIA_LABEL = "Image or video"
    MEDIA_HELP = "Upload an image (jpg/png/webp/gif) or a video (mp4/webm/mov). Videos play muted on loop."

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if "image" in self.fields:
            self.fields["image"].label = self.MEDIA_LABEL
            self.fields["image"].help_text = self.MEDIA_HELP

    def clean_image(self):
        f = self.cleaned_data.get("image")
        if f and hasattr(f, "name") and not f.name.lower().endswith(self.ALLOWED_EXTENSIONS):
            raise forms.ValidationError("Unsupported file type. Use jpg, png, webp, gif, mp4, webm or mov.")
        return f


class CTABannerForm(MediaFileFormMixin, forms.ModelForm):
    class Meta:
        model = CTABanner
        fields = "__all__"


class HeroSlideForm(MediaFileFormMixin, forms.ModelForm):
    MEDIA_HELP = "Upload an image (jpg/png/webp/gif) or a video (mp4/webm/mov). A video slide plays muted on loop while it is the active slide."

    class Meta:
        model = HeroSlide
        fields = "__all__"


@admin.register(SiteSettings)
class SiteSettingsAdmin(admin.ModelAdmin):
    list_display = ["site_name", "email", "phone_whatsapp"]

    def has_add_permission(self, request):
        return not SiteSettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(HeroSlide)
class HeroSlideAdmin(admin.ModelAdmin):
    form = HeroSlideForm
    list_display = ["title", "location", "date", "media_kind", "order", "media_preview"]
    list_editable = ["order"]
    ordering = ["order"]

    def media_kind(self, obj):
        if not obj.image:
            return "-"
        return "Video" if obj.is_video() else "Image"

    media_kind.short_description = "Type"

    def media_preview(self, obj):
        if not obj.image:
            return "-"
        if obj.is_video():
            return format_html('<video src="{}" width="80" height="45" style="object-fit:cover" muted preload="metadata"></video>', obj.image.url)
        return format_html('<img src="{}" width="80" height="45" style="object-fit:cover"/>', obj.image.url)

    media_preview.short_description = "Preview"


@admin.register(BrandStatement)
class BrandStatementAdmin(admin.ModelAdmin):
    list_display = ["headline", "tagline", "order"]
    list_editable = ["order"]


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ["name", "tag", "order", "icon_preview"]
    list_editable = ["order"]

    def icon_preview(self, obj):
        if obj.icon:
            return format_html('<img src="{}" width="40" height="40" style="object-fit:contain"/>', obj.icon.url)
        return "-"

    icon_preview.short_description = "Icon"


class PortfolioItemInline(admin.TabularInline):
    model = PortfolioItem
    extra = 0
    ordering = ["order"]


@admin.register(PortfolioCategory)
class PortfolioCategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "order", "item_count"]
    list_editable = ["order"]
    prepopulated_fields = {"slug": ("name",)}
    inlines = [PortfolioItemInline]

    def item_count(self, obj):
        return obj.items.count()

    item_count.short_description = "Items"


@admin.register(PortfolioItem)
class PortfolioItemAdmin(admin.ModelAdmin):
    list_display = ["title", "category", "meta", "order", "image_preview"]
    list_filter = ["category"]
    list_editable = ["order"]

    def image_preview(self, obj):
        if obj.image:
            return format_html('<img src="{}" width="60" height="40" style="object-fit:cover"/>', obj.image.url)
        return "-"

    image_preview.short_description = "Preview"


@admin.register(Quote)
class QuoteAdmin(admin.ModelAdmin):
    list_display = ["text_short", "author", "order"]
    list_editable = ["order"]

    def text_short(self, obj):
        return obj.text[:60] + "..." if len(obj.text) > 60 else obj.text

    text_short.short_description = "Quote"


@admin.register(ProcessStep)
class ProcessStepAdmin(admin.ModelAdmin):
    list_display = ["step_number", "title", "order"]
    list_editable = ["order"]


@admin.register(Testimonial)
class TestimonialAdmin(admin.ModelAdmin):
    list_display = ["author_name", "author_title", "order", "image_preview"]
    list_editable = ["order"]

    def image_preview(self, obj):
        if obj.image:
            return format_html('<img src="{}" width="40" height="40" style="object-fit:cover;border-radius:50%"/>', obj.image.url)
        return "-"

    image_preview.short_description = "Photo"


@admin.register(Stat)
class StatAdmin(admin.ModelAdmin):
    list_display = ["count", "suffix", "label", "order"]
    list_editable = ["order"]


@admin.register(CTABanner)
class CTABannerAdmin(admin.ModelAdmin):
    form = CTABannerForm
    list_display = ["heading", "button_text", "media_kind", "order", "media_preview"]
    list_editable = ["order"]

    def media_kind(self, obj):
        if not obj.image:
            return "-"
        return "Video" if obj.is_video() else "Image"

    media_kind.short_description = "Type"

    def media_preview(self, obj):
        if not obj.image:
            return "-"
        if obj.is_video():
            return format_html('<video src="{}" width="80" height="45" style="object-fit:cover" muted preload="metadata"></video>', obj.image.url)
        return format_html('<img src="{}" width="80" height="45" style="object-fit:cover"/>', obj.image.url)

    media_preview.short_description = "Preview"


@admin.register(SiteSection)
class SiteSectionAdmin(admin.ModelAdmin):
    list_display = ["section_key", "eyebrow_label", "heading", "order"]
    list_editable = ["order"]


@admin.register(PricingPackage)
class PricingPackageAdmin(admin.ModelAdmin):
    list_display = ["name", "tier", "price", "price_suffix", "is_featured", "order"]
    list_editable = ["price", "is_featured", "order"]
    list_filter = ["tier", "is_featured"]


@admin.register(InstagramPost)
class InstagramPostAdmin(admin.ModelAdmin):
    list_display = ["caption", "kind", "link", "order", "cover_preview"]
    list_editable = ["order"]
    fieldsets = [
        (None, {
            "fields": ["link", "caption", "image", "order"],
            "description": "Paste any public Instagram reel or post URL (e.g. https://www.instagram.com/reel/ABC123/). "
                           "The preview type is detected automatically. Upload a cover image for the card — "
                           "the live Instagram embed loads only when a visitor clicks it.",
        }),
    ]

    def kind(self, obj):
        return obj.media_kind().title()

    kind.short_description = "Type"

    def cover_preview(self, obj):
        if obj.image:
            return format_html('<img src="{}" width="48" height="60" style="object-fit:cover;border-radius:4px"/>', obj.image.url)
        return "-"

    cover_preview.short_description = "Cover"


@admin.register(Enquiry)
class EnquiryAdmin(admin.ModelAdmin):
    list_display = ["name", "email", "event_date", "created_at", "is_read"]
    list_filter = ["is_read"]
    list_editable = ["is_read"]
    search_fields = ["name", "email", "message"]
