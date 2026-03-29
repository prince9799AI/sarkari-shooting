from django.contrib import admin
from django.utils.html import format_html

admin.site.site_header = "Sarkari Shooting Admin"
admin.site.site_title = "Sarkari Shooting"
admin.site.index_title = "Content Management"
from .models import (
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
    Enquiry,
)


@admin.register(SiteSettings)
class SiteSettingsAdmin(admin.ModelAdmin):
    list_display = ["site_name", "email", "phone_whatsapp"]

    def has_add_permission(self, request):
        return not SiteSettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(HeroSlide)
class HeroSlideAdmin(admin.ModelAdmin):
    list_display = ["title", "location", "date", "order", "image_preview"]
    list_editable = ["order"]
    ordering = ["order"]

    def image_preview(self, obj):
        if obj.image:
            return format_html('<img src="{}" width="80" height="45" style="object-fit:cover"/>', obj.image.url)
        return "-"

    image_preview.short_description = "Preview"


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
    list_display = ["heading", "button_text", "order", "image_preview"]
    list_editable = ["order"]

    def image_preview(self, obj):
        if obj.image:
            return format_html('<img src="{}" width="80" height="45" style="object-fit:cover"/>', obj.image.url)
        return "-"

    image_preview.short_description = "Preview"


@admin.register(SiteSection)
class SiteSectionAdmin(admin.ModelAdmin):
    list_display = ["section_key", "eyebrow_label", "heading", "order"]
    list_editable = ["order"]


@admin.register(Enquiry)
class EnquiryAdmin(admin.ModelAdmin):
    list_display = ["name", "email", "event_date", "created_at", "is_read"]
    list_filter = ["is_read"]
    list_editable = ["is_read"]
    search_fields = ["name", "email", "message"]
