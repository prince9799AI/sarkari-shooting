"""
Management command to seed sample data for the admin portal.
Run: python manage.py seed_sample_data
"""
from django.core.management.base import BaseCommand
from sarkari.models import (
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
)


class Command(BaseCommand):
    help = "Seed sample data for Sarkari Shooting site"

    def handle(self, *args, **options):
        self.stdout.write("Seeding sample data...")

        # SiteSettings - singleton
        if not SiteSettings.objects.exists():
            SiteSettings.objects.create(
                site_name="Sarkari Shooting",
                phone_whatsapp="+91 9XXX XXX XXX",
                studio_address="Sarkari Shooting Studio, Near City Palace, Jaipur, Rajasthan 302001",
                email="info@sarkarishooting.com",
                working_hours="Mon – Sat: 10:00 AM – 8:00 PM",
                whatsapp_url="https://wa.me/919XXXXXXXXX",
                instagram_url="https://instagram.com/sarkarishooting",
                facebook_url="https://facebook.com/sarkarishooting",
                copyright_text="© 2026 — Sarkari Shooting Cinematography. All rights reserved.",
            )
            self.stdout.write(self.style.SUCCESS("Created SiteSettings"))

        # HeroSlide - 5 items
        if not HeroSlide.objects.exists():
            slides = [
                ("Udaipur, Rajasthan", "February 2026", "Royal Wedding Film",
                 "A grand celebration in the City of Lakes, captured through our cinematic lens with breathtaking aerial shots and intimate moments."),
                ("Goa, India", "January 2026", "Pre-Wedding Magic",
                 "Sun-kissed beaches and golden hour light — crafting pre-wedding stories that feel like cinema."),
                ("Mumbai, India", "March 2026", "Corporate Brilliance",
                 "Professional event coverage that elevates your brand with polished visuals and compelling storytelling."),
                ("Ranthambore, Rajasthan", "December 2025", "Destination Wedding",
                 "A majestic safari-themed wedding amidst the wilderness, where love met adventure."),
                ("Jaipur, India", "November 2025", "Traditional Elegance",
                 "Classic Rajasthani wedding with vibrant colours, folk music, and timeless rituals beautifully captured."),
            ]
            for i, (loc, date, title, desc) in enumerate(slides):
                HeroSlide.objects.create(
                    location=loc, date=date, title=title, description=desc,
                    link_text="View Portfolio", order=i
                )
            self.stdout.write(self.style.SUCCESS("Created 5 HeroSlides (upload images via admin)"))

        # BrandStatement - 5 items
        if not BrandStatement.objects.exists():
            brands = [
                ("Crafting Visual Stories That Last Forever", "Professional Cinematography & Photography Services"),
                ("Every Frame Tells a Story", "We capture the moments that matter most"),
                ("From Concept to Screen", "Full-service production for weddings, events, and brands"),
                ("Where Art Meets Emotion", "Cinematic storytelling that moves hearts"),
                ("Your Story, Our Lens", "Personalised visual narratives for every occasion"),
            ]
            for i, (headline, tagline) in enumerate(brands):
                BrandStatement.objects.create(headline=headline, tagline=tagline, order=i)
            self.stdout.write(self.style.SUCCESS("Created 5 BrandStatements"))

        # Service - 5 items
        if not Service.objects.exists():
            services = [
                ("Cinematic Films", "Wedding Cinematography",
                 "We transform your wedding day into a cinematic masterpiece — every laugh, tear, and dance move captured with artistry and emotion."),
                ("Romantic Storytelling", "Pre-Wedding Shoots",
                 "Stunning location shoots that celebrate your love story — from misty mountains to sun-kissed beaches, we create timeless memories."),
                ("Complete Coverage", "Event Photography",
                 "Corporate launches, concerts, festivals, or private celebrations — we deliver professional coverage that tells the complete story."),
                ("Brand Storytelling", "Corporate Films",
                 "Elevate your brand with polished corporate videos, documentaries, and promotional content that resonates with your audience."),
                ("Visual Music", "Music Videos",
                 "Dynamic music video production with creative direction, vibrant colour grading, and storytelling that matches the rhythm of your tracks."),
            ]
            for i, (tag, name, desc) in enumerate(services):
                Service.objects.create(tag=tag, name=name, description=desc, order=i)
            self.stdout.write(self.style.SUCCESS("Created 5 Services (upload icons via admin)"))

        # PortfolioCategory - 5 items
        if not PortfolioCategory.objects.exists():
            cats = [
                ("Weddings", "weddings"),
                ("Pre-Wedding", "prewedding"),
                ("Events", "events"),
                ("Corporate", "corporate"),
                ("Music Videos", "musicvids"),
            ]
            for i, (name, slug) in enumerate(cats):
                PortfolioCategory.objects.create(name=name, slug=slug, order=i)
            self.stdout.write(self.style.SUCCESS("Created 5 PortfolioCategories"))

        # PortfolioItem - 5 items (requires categories)
        if not PortfolioItem.objects.exists() and PortfolioCategory.objects.exists():
            cats = list(PortfolioCategory.objects.all().order_by("order"))
            items = [
                ("Priya & Rahul", "Dec 2025 · Udaipur", "A royal wedding at the City of Lakes with traditional rituals and modern celebrations.", "Lake Palace Hotel", "Royal Wedding, Udaipur, Traditional"),
                ("Ananya & Vikram", "Jan 2026 · Manali", "Pre-wedding shoot amidst snow-capped peaks and pine forests.", "Solang Valley", "Pre-Wedding, Manali, Mountain"),
                ("TechCorp Annual Meet", "Mar 2026 · Mumbai", "Corporate event coverage with keynote speeches and networking moments.", "Grand Hyatt", "Corporate, Mumbai, Conference"),
                ("Sangeet Night", "Feb 2026 · Jaipur", "Vibrant sangeet ceremony with dance performances and live music.", "Rambagh Palace", "Events, Jaipur, Sangeet"),
                ("Rising Star - Debut Single", "Nov 2025 · Delhi", "Music video for an indie artist's debut release.", "Warehouse Studio", "Music Video, Delhi, Indie"),
            ]
            for i, (title, meta, desc, venue, tags) in enumerate(items):
                PortfolioItem.objects.create(
                    category=cats[i % len(cats)],
                    title=title,
                    meta=meta,
                    description=desc,
                    venue=venue,
                    tags=tags,
                    testimonial_text="Absolutely stunning work! We couldn't be happier with the final film." if i < 3 else "",
                    testimonial_author="Happy Client" if i < 3 else "",
                    order=i
                )
            self.stdout.write(self.style.SUCCESS("Created 5 PortfolioItems (add gallery images/videos via admin)"))

        # Quote - 5 items
        if not Quote.objects.exists():
            quotes = [
                ("A photograph is a secret about a secret. The more it tells you, the less you know.", "Diane Arbus"),
                ("We are making photographs to understand what our lives mean to us.", "Ralph Hattersley"),
                ("Photography is the story I fail to put into words.", "Destin Sparks"),
                ("In photography there is a reality so subtle that it becomes more real than reality.", "Alfred Stieglitz"),
                ("The best thing about a picture is that it never changes, even when the people in it do.", "Andy Warhol"),
            ]
            for i, (text, author) in enumerate(quotes):
                Quote.objects.create(text=text, author=author, order=i)
            self.stdout.write(self.style.SUCCESS("Created 5 Quotes"))

        # ProcessStep - 5 items
        if not ProcessStep.objects.exists():
            steps = [
                ("01", "Consultation", "We begin with an in-depth conversation to understand your vision, style preferences, and the story you want to tell."),
                ("02", "Planning", "Our team scouts locations, designs mood boards, and creates a detailed production plan tailored to your project."),
                ("03", "Production", "On shoot day, our experienced crew captures every moment with state-of-the-art cameras, drones, and lighting equipment."),
                ("04", "Post-Production", "Expert colour grading, sound design, and cinematic editing bring your story to life with professional polish."),
                ("05", "Delivery", "Your final film is delivered in stunning quality, ready to share and treasure for a lifetime."),
            ]
            for i, (num, title, desc) in enumerate(steps):
                ProcessStep.objects.create(step_number=num, title=title, description=desc, order=i)
            self.stdout.write(self.style.SUCCESS("Created 5 ProcessSteps"))

        # Testimonial - 5 items
        if not Testimonial.objects.exists():
            testimonials = [
                ("Sarkari Shooting captured our wedding so beautifully that we relive the emotions every time we watch the film. Truly cinematic!", "Priya & Rahul", "Wedding Client · Udaipur"),
                ("The pre-wedding shoot exceeded all our expectations. Every frame looks like it belongs in a magazine. Highly recommended!", "Ananya Sharma", "Pre-Wedding Client · Manali"),
                ("Professional, creative, and incredibly talented. They turned our corporate event into a visual masterpiece.", "Rajesh Gupta", "Corporate Client · Mumbai"),
                ("From the first meeting to final delivery, the team was exceptional. Our music video looks like a Bollywood production!", "Neha Kapoor", "Music Video Client · Delhi"),
                ("They captured every precious moment of our sangeet. The energy and emotion in the film is incredible!", "Kavya & Arjun", "Event Client · Jaipur"),
            ]
            for i, (text, name, title) in enumerate(testimonials):
                Testimonial.objects.create(text=text, author_name=name, author_title=title, order=i)
            self.stdout.write(self.style.SUCCESS("Created 5 Testimonials"))

        # Stat - 5 items
        if not Stat.objects.exists():
            stats = [
                (500, "+", "Projects Completed"),
                (350, "+", "Happy Clients"),
                (8, "+", "Years Experience"),
                (25, "+", "Cities Covered"),
                (15, "+", "Awards Won"),
            ]
            for i, (count, suffix, label) in enumerate(stats):
                Stat.objects.create(count=count, suffix=suffix, label=label, order=i)
            self.stdout.write(self.style.SUCCESS("Created 5 Stats"))

        # SiteSection - 5 items
        if not SiteSection.objects.exists():
            sections = [
                ("services", "What We Offer", "Our Creative Services"),
                ("portfolio", "Our Work", "Featured Portfolio"),
                ("process", "How We Work", "Our Creative Process"),
                ("testimonials", "Client Love", "What Our Clients Say"),
                ("contact", "Reach Out", "Let's Work Together"),
            ]
            for i, (key, eyebrow, heading) in enumerate(sections):
                SiteSection.objects.create(section_key=key, eyebrow_label=eyebrow, heading=heading, order=i)
            self.stdout.write(self.style.SUCCESS("Created 5 SiteSections"))

        # CTABanner - 5 items
        if not CTABanner.objects.exists():
            ctas = [
                ("Ready to Create Something Beautiful?", "Book a Session", ""),
                ("Let's Tell Your Story", "Get In Touch", ""),
                ("Your Vision, Our Expertise", "Start a Project", ""),
                ("Capture the Moments That Matter", "Schedule a Call", ""),
                ("Transform Your Event Into Art", "Request a Quote", ""),
            ]
            for i, (heading, btn_text, link) in enumerate(ctas):
                CTABanner.objects.create(heading=heading, button_text=btn_text, button_link=link, order=i)
            self.stdout.write(self.style.SUCCESS("Created 5 CTABanners (upload images via admin)"))

        self.stdout.write(self.style.SUCCESS("Done! Log in to /admin/ to upload images and manage content."))
