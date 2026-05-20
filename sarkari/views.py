from django.shortcuts import render, redirect, get_object_or_404
from django.urls import reverse
from django.views import View
from django.contrib import messages
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


def get_site_settings():
    """Get or create default site settings."""
    settings_obj = SiteSettings.objects.first()
    if not settings_obj:
        settings_obj = SiteSettings.objects.create()
    return settings_obj


def get_section(section_key, default_eyebrow, default_heading):
    """Get section labels or use defaults."""
    try:
        section = SiteSection.objects.get(section_key=section_key)
        return section.eyebrow_label, section.heading
    except SiteSection.DoesNotExist:
        return default_eyebrow, default_heading


class IndexView(View):
    template_name = "index.html"

    def get(self, request):
        context = {}
        return render(request, self.template_name, context)


class NewDesigneView(View):
    template_name = "new_designe.html"

    def get(self, request):
        context = self._build_context()
        return render(request, self.template_name, context)

    def post(self, request):
        name = request.POST.get("name", "").strip()
        email = request.POST.get("email", "").strip()
        phone = request.POST.get("phone", "").strip()
        event_date = request.POST.get("event_date", "").strip()
        event_location = request.POST.get("event_location", "").strip()
        message = request.POST.get("message", "").strip()

        if name and email:
            Enquiry.objects.create(
                name=name,
                email=email,
                phone=phone,
                event_date=event_date,
                event_location=event_location,
                message=message,
            )
            messages.success(request, "Thank you! Your enquiry has been sent. We'll get back to you soon.")
        else:
            messages.error(request, "Please provide your name and email.")

        return redirect(reverse("new_designe") + "#contact-section")

    def _build_context(self):
        site = get_site_settings()
        return {
            "site": site,
            "hero_slides": HeroSlide.objects.all(),
            "brand_statements": BrandStatement.objects.all(),
            "services": Service.objects.all(),
            "portfolio_categories": PortfolioCategory.objects.prefetch_related("items").all(),
            "quotes": Quote.objects.all(),
            "process_steps": ProcessStep.objects.all(),
            "testimonials": Testimonial.objects.all(),
            "stats": Stat.objects.all(),
            "cta_banners": CTABanner.objects.all(),
            "section_services": get_section("services", "What We Offer", "Our Creative Services"),
            "section_portfolio": get_section("portfolio", "Our Work", "Featured Portfolio"),
            "section_process": get_section("process", "How We Work", "Our Creative Process"),
            "section_testimonials": get_section("testimonials", "Client Love", "What Our Clients Say"),
            "section_contact": get_section("contact", "Reach Out", "Let's Work Together"),
        }


class ContactView(View):
    template_name = "contact.html"

    def get(self, request):
        context = {"site": get_site_settings()}
        return render(request, self.template_name, context)


class FilmDetailView(View):
    """Film detail page (like theweddingfilmer.com/twf-films/...)"""
    template_name = "film_detail.html"

    def get(self, request, pk):
        film = get_object_or_404(PortfolioItem, pk=pk)
        category = film.category
        related = list(category.items.exclude(pk=film.pk).order_by("?")[:5])
        if len(related) < 5:
            extra = list(
                PortfolioItem.objects.exclude(pk=film.pk)
                .exclude(pk__in=[r.pk for r in related])
                .order_by("?")[: 5 - len(related)]
            )
            related.extend(extra)
        else:
            related = related[:5]

        meta_parts = film.meta.split("·") if film.meta else []
        date = meta_parts[0].strip() if len(meta_parts) > 0 else ""
        location = meta_parts[1].strip() if len(meta_parts) > 1 else (meta_parts[0] if len(meta_parts) == 1 else "")
        tags_list = [t.strip() for t in film.tags.split(",") if t.strip()] if film.tags else []

        context = {
            "site": get_site_settings(),
            "film": film,
            "related": related,
            "date": date,
            "location": location,
            "tags_list": tags_list,
        }
        return render(request, self.template_name, context)
