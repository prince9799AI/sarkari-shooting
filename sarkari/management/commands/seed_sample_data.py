"""
Management command to seed sample data for the admin portal.

Usage:
    python manage.py seed_sample_data            # seed only if a model is empty
    python manage.py seed_sample_data --clear    # delete existing rows first, then seed
    python manage.py seed_sample_data --force    # always top-up missing rows even if not empty
    python manage.py seed_sample_data --no-media # skip generating placeholder images/videos

Creates 40+ records for every content model (SiteSettings stays a singleton)
and generates real placeholder JPGs / copies a sample MP4 into every
ImageField / FileField so the site looks populated out of the box.
"""
import os
import shutil
from datetime import timedelta
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import timezone

try:
    from PIL import Image, ImageDraw, ImageFont
    PIL_AVAILABLE = True
except ImportError:  # Pillow is a Django dependency for ImageField but guard anyway
    PIL_AVAILABLE = False

from sarkari.models import (
    SiteSettings,
    HeroSlide,
    BrandStatement,
    Service,
    PortfolioCategory,
    PortfolioItem,
    PortfolioItemImage,
    PortfolioItemVideo,
    Quote,
    ProcessStep,
    Testimonial,
    Stat,
    CTABanner,
    SiteSection,
    Enquiry,
)


# ---------------------------------------------------------------------------
# PLACEHOLDER MEDIA GENERATION
# ---------------------------------------------------------------------------

# Curated brand-ish palette so the placeholders look cohesive in the admin.
PALETTE = [
    ("#1F3A5F", "#F5E0C3"),  # navy / cream
    ("#2A4D3A", "#E8D5B7"),  # forest / sand
    ("#7A2E2E", "#F2D0A4"),  # crimson / peach
    ("#3D2E5F", "#E5C9A8"),  # plum / champagne
    ("#5B3A29", "#F0E3CC"),  # cocoa / parchment
    ("#1B4D4D", "#F4D9A0"),  # teal / gold
    ("#6B2C39", "#EFD9B4"),  # wine / honey
    ("#2C3E50", "#F8E9C9"),  # midnight / butter
    ("#4A4035", "#E7CDA1"),  # taupe / cream
    ("#3E2C41", "#F1D5A5"),  # mauve / soft gold
    ("#1C3144", "#E9C9A0"),  # ink / amber
    ("#5A2A27", "#F3DBB1"),  # rust / sand
]


def _hex_to_rgb(hex_color: str) -> tuple:
    hex_color = hex_color.lstrip("#")
    return tuple(int(hex_color[i:i + 2], 16) for i in (0, 2, 4))


def _palette_for(i: int) -> tuple:
    bg, fg = PALETTE[i % len(PALETTE)]
    return _hex_to_rgb(bg), _hex_to_rgb(fg)


def _load_font(size: int):
    """Try a couple of common font paths; fall back to the PIL default."""
    candidates = [
        "/System/Library/Fonts/Supplemental/Georgia.ttf",
        "/System/Library/Fonts/Supplemental/Times New Roman.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/Library/Fonts/Arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf",
    ]
    for path in candidates:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except OSError:
                continue
    return ImageFont.load_default()


def _wrap_text(text: str, max_chars: int) -> list:
    words = text.split()
    lines, current = [], ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if len(candidate) <= max_chars:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def _draw_placeholder(path: Path, w: int, h: int, label: str, sublabel: str, index: int):
    """Create a colored JPEG with title text and a subtitle, saved to `path`."""
    bg, fg = _palette_for(index)
    img = Image.new("RGB", (w, h), bg)
    draw = ImageDraw.Draw(img)

    border = max(8, min(w, h) // 60)
    draw.rectangle(
        [(border, border), (w - border, h - border)],
        outline=fg, width=max(2, border // 4),
    )

    title_size = max(18, min(w, h) // 14)
    sub_size = max(12, min(w, h) // 28)
    title_font = _load_font(title_size)
    sub_font = _load_font(sub_size)

    max_chars = max(8, w // (title_size // 2))
    title_lines = _wrap_text(label, max_chars)

    def _line_h(font, line: str) -> int:
        if hasattr(draw, "textbbox"):
            bbox = draw.textbbox((0, 0), line, font=font)
            return bbox[3] - bbox[1]
        return font.getsize(line)[1] if hasattr(font, "getsize") else title_size

    line_height = _line_h(title_font, "Ag") + max(4, title_size // 6)
    total_h = line_height * len(title_lines) + _line_h(sub_font, "Ag") + max(8, sub_size)

    y = (h - total_h) // 2
    for line in title_lines:
        if hasattr(draw, "textlength"):
            tw = draw.textlength(line, font=title_font)
        else:
            tw = title_font.getsize(line)[0] if hasattr(title_font, "getsize") else len(line) * title_size // 2
        draw.text(((w - tw) // 2, y), line, font=title_font, fill=fg)
        y += line_height

    y += max(6, sub_size // 2)
    if hasattr(draw, "textlength"):
        sw = draw.textlength(sublabel, font=sub_font)
    else:
        sw = sub_font.getsize(sublabel)[0] if hasattr(sub_font, "getsize") else len(sublabel) * sub_size // 2
    draw.text(((w - sw) // 2, y), sublabel, font=sub_font, fill=fg)

    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, format="JPEG", quality=82, optimize=True)


def _make_image(rel_path: str, w: int, h: int, label: str, sublabel: str, index: int) -> str:
    """Write a placeholder image at MEDIA_ROOT/<rel_path> and return rel_path."""
    if not PIL_AVAILABLE:
        return rel_path
    full = Path(settings.MEDIA_ROOT) / rel_path
    _draw_placeholder(full, w, h, label, sublabel, index)
    return rel_path


def _find_sample_video() -> Path | None:
    """Return any existing .mp4 in MEDIA_ROOT we can reuse as a placeholder."""
    root = Path(settings.MEDIA_ROOT)
    if not root.exists():
        return None
    for path in root.rglob("*.mp4"):
        if path.is_file() and path.stat().st_size > 0:
            return path
    return None


def _make_video(rel_path: str, source: Path | None) -> str | None:
    """Copy the sample video to MEDIA_ROOT/<rel_path>. Returns rel_path or None."""
    if source is None:
        return None
    target = Path(settings.MEDIA_ROOT) / rel_path
    target.parent.mkdir(parents=True, exist_ok=True)
    if not target.exists():
        shutil.copyfile(source, target)
    return rel_path


# ---------------------------------------------------------------------------
# DATA POOLS
# ---------------------------------------------------------------------------

LOCATIONS = [
    "Udaipur, Rajasthan", "Goa, India", "Mumbai, India", "Ranthambore, Rajasthan",
    "Jaipur, Rajasthan", "Delhi, India", "Bangalore, Karnataka", "Chennai, Tamil Nadu",
    "Hyderabad, Telangana", "Kolkata, West Bengal", "Pune, Maharashtra", "Ahmedabad, Gujarat",
    "Lucknow, Uttar Pradesh", "Chandigarh, Punjab", "Shimla, Himachal Pradesh",
    "Manali, Himachal Pradesh", "Darjeeling, West Bengal", "Munnar, Kerala",
    "Kochi, Kerala", "Pondicherry, India", "Andaman Islands", "Rishikesh, Uttarakhand",
    "Nainital, Uttarakhand", "Mussoorie, Uttarakhand", "Jaisalmer, Rajasthan",
    "Jodhpur, Rajasthan", "Pushkar, Rajasthan", "Mount Abu, Rajasthan",
    "Bikaner, Rajasthan", "Agra, Uttar Pradesh", "Varanasi, Uttar Pradesh",
    "Kashmir Valley", "Leh, Ladakh", "Spiti Valley, HP", "Gangtok, Sikkim",
    "Shillong, Meghalaya", "Coorg, Karnataka", "Ooty, Tamil Nadu",
    "Hampi, Karnataka", "Alibaug, Maharashtra", "Lonavala, Maharashtra",
    "Khajuraho, MP", "Jim Corbett, UK", "Wayanad, Kerala", "Tirupati, AP",
]

DATES = [
    "Jan 2026", "Feb 2026", "Mar 2026", "Apr 2026", "May 2026", "Jun 2026",
    "Jul 2026", "Aug 2026", "Sep 2026", "Oct 2026", "Nov 2025", "Dec 2025",
    "Oct 2025", "Sep 2025", "Aug 2025", "Jul 2025", "Jun 2025", "May 2025",
    "Apr 2025", "Mar 2025", "Feb 2025", "Jan 2025", "Dec 2024", "Nov 2024",
]

INDIAN_FIRST_NAMES = [
    "Priya", "Rahul", "Ananya", "Vikram", "Neha", "Arjun", "Kavya", "Rohan",
    "Meera", "Aditya", "Riya", "Karan", "Diya", "Aryan", "Saanvi", "Ishaan",
    "Aaradhya", "Vihaan", "Aanya", "Reyansh", "Anika", "Kabir", "Tara",
    "Yash", "Maya", "Dev", "Sara", "Krish", "Anvi", "Atharv", "Pari", "Veer",
    "Aisha", "Shaurya", "Myra", "Rudra", "Kiara", "Aarav", "Zara", "Shivansh",
]

INDIAN_LAST_NAMES = [
    "Sharma", "Verma", "Gupta", "Singh", "Patel", "Kapoor", "Mehta", "Joshi",
    "Reddy", "Iyer", "Nair", "Menon", "Chopra", "Khanna", "Malhotra", "Bhatia",
    "Sinha", "Mishra", "Tiwari", "Pandey", "Yadav", "Kumar", "Das", "Ghosh",
    "Mukherjee", "Banerjee", "Bose", "Roy", "Sen", "Dutta", "Chatterjee",
    "Saxena", "Agarwal", "Bansal", "Goyal", "Jain", "Khurana", "Arora",
    "Bhattacharya", "Pillai",
]

VENUES = [
    "Lake Palace Hotel", "Taj Falaknuma", "Rambagh Palace", "Umaid Bhawan",
    "Leela Palace", "Oberoi Udaivilas", "Grand Hyatt", "ITC Maurya",
    "JW Marriott", "Hilton Mumbai", "Lalit Palace", "Wildflower Hall",
    "Suryagarh Jaisalmer", "Devi Garh", "Samode Palace", "Neemrana Fort",
    "Ananda in the Himalayas", "Glenburn Tea Estate", "Brunton Boatyard",
    "Spice Tree Munnar", "Banyan Tree Goa", "Park Hyatt Goa",
    "Solang Valley", "Khajjiar Meadows", "Tso Moriri Lake", "Pangong Lake",
    "Dal Lake", "Pelling Viewpoint", "Hampi Ruins", "Cherrapunji Falls",
    "Warehouse Studio Delhi", "Phoenix Marketcity", "Mehrangarh Fort",
    "Amer Fort", "Chittorgarh Fort", "Jagmandir Island", "City Palace Udaipur",
    "Sam Sand Dunes", "Bara Bagh", "Backwaters Alleppey",
]

PHOTOGRAPHY_QUOTES = [
    ("A photograph is a secret about a secret. The more it tells you, the less you know.", "Diane Arbus"),
    ("We are making photographs to understand what our lives mean to us.", "Ralph Hattersley"),
    ("Photography is the story I fail to put into words.", "Destin Sparks"),
    ("In photography there is a reality so subtle that it becomes more real than reality.", "Alfred Stieglitz"),
    ("The best thing about a picture is that it never changes, even when the people in it do.", "Andy Warhol"),
    ("You don't take a photograph, you make it.", "Ansel Adams"),
    ("Photography takes an instant out of time, altering life by holding it still.", "Dorothea Lange"),
    ("Photography is the art of frozen time… the ability to store emotion and feelings within a frame.", "Meshack Otieno"),
    ("There are no rules for good photographs, there are only good photographs.", "Ansel Adams"),
    ("The camera is an instrument that teaches people how to see without a camera.", "Dorothea Lange"),
    ("Photography is more than a medium for factual communication. It is a creative art.", "Ansel Adams"),
    ("Which of my photographs is my favorite? The one I'm going to take tomorrow.", "Imogen Cunningham"),
    ("Light makes photography. Embrace light. Admire it. Love it. But above all, know light.", "George Eastman"),
    ("A great photograph is one that fully expresses what one feels about what is being photographed.", "Ansel Adams"),
    ("Beauty can be seen in all things, seeing and composing the beauty is what separates the snapshot from the photograph.", "Matt Hardy"),
    ("Photography is a way of feeling, of touching, of loving.", "Aaron Siskind"),
    ("Twelve significant photographs in any one year is a good crop.", "Ansel Adams"),
    ("The single most important component of a camera is the twelve inches behind it.", "Ansel Adams"),
    ("When words become unclear, I shall focus with photographs.", "Ansel Adams"),
    ("Photography is truth. The cinema is truth twenty-four times per second.", "Jean-Luc Godard"),
    ("Cinema is a matter of what's in the frame and what's out.", "Martin Scorsese"),
    ("Movies are the memories of our lifetime.", "Martin Scorsese"),
    ("A film is — or should be — more like music than like fiction.", "Stanley Kubrick"),
    ("Every cut is the climax of all that came before, and the bias of all that comes after.", "Walter Murch"),
    ("Cinema is the most beautiful fraud in the world.", "Jean-Luc Godard"),
    ("If it can be written, or thought, it can be filmed.", "Stanley Kubrick"),
    ("A great film should seem like a perfectly executed crime.", "Stanley Kubrick"),
    ("There's nothing like a hand-held shot to convey a sense of urgency.", "Roger Deakins"),
    ("Light, shade, and perspective will always be the masters of the painter.", "Henri Cartier-Bresson"),
    ("To photograph is to hold one's breath, when all faculties converge to capture fleeting reality.", "Henri Cartier-Bresson"),
    ("Your first 10,000 photographs are your worst.", "Henri Cartier-Bresson"),
    ("Photography, as we all know, is not real at all. It is an illusion of reality.", "Alfred Stieglitz"),
    ("If your pictures aren't good enough, you aren't close enough.", "Robert Capa"),
    ("Photography is an art of observation.", "Elliott Erwitt"),
    ("To me, photography is an art of observation. It's about finding something interesting in an ordinary place.", "Elliott Erwitt"),
    ("Once photography enters your bloodstream, it is like a disease.", "Anonymous"),
    ("A camera is a save button for the mind's eye.", "Roger Kingston"),
    ("The picture that you took with your camera is the imagination you want to create with reality.", "Scott Lorenzo"),
    ("Photography is a love affair with life.", "Burk Uzzle"),
    ("Every picture tells a story.", "Rod Stewart"),
    ("Capture the moment, before it becomes a memory.", "Anonymous"),
    ("Photography is poetry written in light.", "Anonymous"),
    ("Don't shoot what it looks like. Shoot what it feels like.", "David Alan Harvey"),
    ("Photography records the gamut of feelings written on the human face.", "Edward Steichen"),
]

PROCESS_STEPS = [
    ("Consultation", "We begin with an in-depth conversation to understand your vision, style preferences, and the story you want to tell."),
    ("Planning", "Our team scouts locations, designs mood boards, and creates a detailed production plan tailored to your project."),
    ("Production", "On shoot day, our experienced crew captures every moment with state-of-the-art cameras, drones, and lighting equipment."),
    ("Post-Production", "Expert colour grading, sound design, and cinematic editing bring your story to life with professional polish."),
    ("Delivery", "Your final film is delivered in stunning quality, ready to share and treasure for a lifetime."),
    ("Discovery Call", "A friendly 30-minute call to learn about you, your event, and the feel you are after."),
    ("Mood Boarding", "Curated visual references that lock in tone, palette, and atmosphere before we shoot a single frame."),
    ("Location Recce", "Pre-shoot site visits to identify the best angles, light pockets, and logistical needs."),
    ("Storyboarding", "Frame-by-frame planning of signature sequences so nothing is left to chance."),
    ("Equipment Prep", "Cinema cameras, gimbals, drones, and audio gear are tested, cleaned, and packed the day before."),
    ("Pre-Wedding Shoot", "An optional creative shoot that doubles as a chemistry session for the main day."),
    ("Wedding Day Coverage", "Multi-camera coverage capturing the rituals, emotions, and details from sunrise to last dance."),
    ("Drone Aerials", "Sweeping aerial cinematography that establishes scale and grandeur."),
    ("Candid Photography", "Documentary-style stills capturing unscripted human moments."),
    ("Couple Portraits", "Intimate, beautifully lit portraits styled to feel timeless."),
    ("Family Portraits", "Group portraits with thoughtful direction so every face looks great."),
    ("Highlight Reel Edit", "A 3-5 minute trailer set to music — your shareable headline film."),
    ("Long-Form Film", "A 20-40 minute documentary edit that tells the full story of the day."),
    ("Colour Grading", "Cinematic colour science applied frame by frame for a unified look."),
    ("Sound Design", "Music licensing, voice-over selection, and ambient sound layering."),
    ("Photo Selection", "We curate the strongest 300-500 images from thousands of raw frames."),
    ("Photo Retouching", "High-end retouching: skin tones, blemishes, distractions removed with care."),
    ("Album Design", "Magazine-style album layouts with hand-picked spreads."),
    ("Album Printing", "Premium fine-art prints, hardcover binding, archival paper."),
    ("Client Review", "You watch the first cut and share feedback — up to two revision rounds included."),
    ("Final Master", "We lock the film, render the final master in 4K, and prepare social cut-downs."),
    ("Digital Delivery", "All assets delivered via a private password-protected gallery for 12 months."),
    ("Physical Delivery", "USB drives, premium prints, and albums shipped in custom keepsake boxes."),
    ("Social Edits", "Vertical and square cut-downs optimised for Instagram, YouTube Shorts, and Reels."),
    ("Behind The Scenes", "A bonus BTS reel showing the craft and chaos behind the magic."),
    ("Backup & Archive", "Triple-redundant backups stored on-site, off-site, and in cold cloud storage."),
    ("Anniversary Edit", "Optional yearly anniversary edit using unused footage — a gift that keeps giving."),
    ("Brand Discovery", "Deep brand research before any corporate or campaign shoot."),
    ("Creative Direction", "We lead concept development from idea to final storyboard."),
    ("Casting", "Talent scouting for models, presenters, and on-screen voices."),
    ("Wardrobe Styling", "Stylist consultation to align outfits with the visual treatment."),
    ("Set Design", "Custom set builds, prop sourcing, and on-location styling."),
    ("Lighting Design", "Cinematic lighting plans calibrated for your venue and time of day."),
    ("Multi-Cam Direction", "Coordinated direction of 2-6 cameras to never miss a moment."),
    ("Live Streaming", "Optional broadcast-quality live stream for remote guests."),
    ("VFX & Motion Graphics", "Title cards, lower-thirds, and tasteful effects layered in post."),
    ("Subtitling & Captions", "Multi-language subtitle export for international audiences."),
]

TESTIMONIALS = [
    ("Sarkari Shooting captured our wedding so beautifully that we relive the emotions every time we watch the film. Truly cinematic!", "Priya & Rahul", "Wedding Client · Udaipur"),
    ("The pre-wedding shoot exceeded all our expectations. Every frame looks like a magazine cover. Highly recommended!", "Ananya Sharma", "Pre-Wedding Client · Manali"),
    ("Professional, creative, and incredibly talented. They turned our corporate event into a visual masterpiece.", "Rajesh Gupta", "Corporate Client · Mumbai"),
    ("From the first meeting to final delivery, the team was exceptional. Our music video looks like a Bollywood production!", "Neha Kapoor", "Music Video Client · Delhi"),
    ("They captured every precious moment of our sangeet. The energy and emotion in the film is incredible!", "Kavya & Arjun", "Event Client · Jaipur"),
    ("Working with Sarkari Shooting was effortless. They are calm under pressure and brilliant in post.", "Vikram Singh", "Wedding Client · Jodhpur"),
    ("Our destination wedding in Goa was a dream — and the highlight reel still makes us cry happy tears.", "Riya & Karan", "Destination Wedding · Goa"),
    ("The drone footage is breathtaking. They literally elevated our wedding into a feature film.", "Aditya Verma", "Wedding Client · Ranthambore"),
    ("Their candid photography is unmatched. We have hundreds of pictures we will treasure forever.", "Meera Patel", "Wedding Client · Ahmedabad"),
    ("Booking them was the best decision of our wedding planning. Worth every rupee.", "Rohan Mehta", "Wedding Client · Pune"),
    ("They told the story of our brand with such heart. Our investors loved the launch film.", "Saanvi Reddy", "Corporate Client · Bangalore"),
    ("Punctual, polite, and incredibly talented. The whole crew felt like family by day's end.", "Ishaan Iyer", "Wedding Client · Chennai"),
    ("The colour grading on our film is gorgeous. It looks like a Wes Anderson short.", "Diya Nair", "Pre-Wedding Client · Munnar"),
    ("Our parents cried watching the long-form film. That alone is everything.", "Aryan Joshi", "Wedding Client · Lucknow"),
    ("Sarkari Shooting documented our 25th anniversary so beautifully. A keepsake forever.", "Yash & Maya", "Anniversary Client · Delhi"),
    ("They covered our product launch with cinematic flair. Press loved the b-roll.", "Dev Kapoor", "Corporate Client · Mumbai"),
    ("Best wedding investment we made. The team is creative, patient, and full of ideas.", "Sara Khanna", "Wedding Client · Chandigarh"),
    ("Booked them for our engagement and immediately re-booked for the wedding. Easy choice.", "Krish Malhotra", "Pre-Wedding Client · Shimla"),
    ("The album they designed is a heirloom. Heavy, hardcover, beautifully printed.", "Anvi Bhatia", "Wedding Client · Jaipur"),
    ("Their music video work elevated our debut single. Half a million views in a week!", "Atharv Sinha", "Music Video Client · Mumbai"),
    ("Communication was flawless from day one. We always knew what was happening.", "Pari Mishra", "Wedding Client · Varanasi"),
    ("They handled our 800-guest sangeet without missing a beat. Total pros.", "Veer Tiwari", "Event Client · Lucknow"),
    ("The behind-the-scenes reel is just as good as the main film. Hilarious and heartwarming.", "Aisha Pandey", "Wedding Client · Pushkar"),
    ("Our destination shoot in Ladakh was epic — they handled the altitude and the angles.", "Shaurya Yadav", "Destination Shoot · Leh"),
    ("The team scouted unique spots in Hampi we'd never have found ourselves.", "Myra Kumar", "Pre-Wedding Client · Hampi"),
    ("Wedding films can feel formulaic — theirs absolutely doesn't. So personal.", "Rudra Das", "Wedding Client · Kolkata"),
    ("They captured my late grandmother's blessings in the film. Priceless.", "Kiara Ghosh", "Wedding Client · Kolkata"),
    ("Our brand documentary won at two regional film festivals. Couldn't be prouder.", "Aarav Mukherjee", "Corporate Client · Bangalore"),
    ("Such a calm, talented crew. They blended into the wedding like guests with cameras.", "Zara Banerjee", "Wedding Client · Goa"),
    ("Delivery was ahead of schedule and quality blew us away. Five stars.", "Shivansh Bose", "Wedding Client · Hyderabad"),
    ("They photographed our newborn shoot with such tenderness. Beautiful images.", "Roshni Roy", "Newborn Client · Delhi"),
    ("Their podcast video setup for our launch was broadcast quality. Wow.", "Karthik Sen", "Corporate Client · Pune"),
    ("Festival coverage was vibrant, fast-paced, and brilliantly edited.", "Tanvi Dutta", "Event Client · Kolkata"),
    ("The team listened to our quirky ideas and made them better. True collaborators.", "Aryaman Chatterjee", "Wedding Client · Sikkim"),
    ("They are masters of natural light. Our outdoor portraits glow.", "Inaya Saxena", "Pre-Wedding Client · Coorg"),
    ("From small intimate ceremony to mega reception, they scaled effortlessly.", "Reyansh Agarwal", "Wedding Client · Delhi"),
    ("Their second shooter was just as talented as the lead. Consistency is everything.", "Avni Bansal", "Wedding Client · Mumbai"),
    ("Final film, photos, and album arrived in a gorgeous keepsake box. Such a treat.", "Kiaan Goyal", "Wedding Client · Jaipur"),
    ("Our cousins overseas finally felt included thanks to the live stream they arranged.", "Mira Jain", "Wedding Client · Udaipur"),
    ("Best vendor decision we made. Period.", "Aarush Khurana", "Wedding Client · Chandigarh"),
    ("Our corporate film helped us close a Series B round. That's real ROI.", "Saira Arora", "Corporate Client · Bangalore"),
    ("They edited our 14-hour day into a 4-minute film that gives me chills every time.", "Vivaan Bhattacharya", "Wedding Client · Mumbai"),
]

SERVICES = [
    ("Cinematic Films", "Wedding Cinematography", "We transform your wedding day into a cinematic masterpiece — every laugh, tear, and dance move captured with artistry."),
    ("Romantic Storytelling", "Pre-Wedding Shoots", "Stunning location shoots that celebrate your love story — from misty mountains to sun-kissed beaches."),
    ("Complete Coverage", "Event Photography", "Corporate launches, concerts, festivals — professional coverage that tells the complete story."),
    ("Brand Storytelling", "Corporate Films", "Polished corporate videos, documentaries, and promotional content that resonates with your audience."),
    ("Visual Music", "Music Videos", "Dynamic music video production with creative direction and storytelling that matches the rhythm of your tracks."),
    ("Aerial Cinematography", "Drone Filming", "Sweeping aerial shots that add scale, drama, and beauty to any production."),
    ("Sound & Story", "Documentary Films", "Long-form documentary work that elevates real stories with cinematic craft."),
    ("Editorial Polish", "Fashion Lookbooks", "Lookbook stills and motion content for designers, boutiques, and ateliers."),
    ("Identity in Light", "Brand Portraits", "Founder and team portraits that look like your company already won."),
    ("Family Heirlooms", "Family Sessions", "Warm, unposed family sessions designed to be reprinted for generations."),
    ("First Moments", "Newborn Photography", "Gentle, safe newborn sessions in studio or at home."),
    ("Tiny Humans", "Maternity Shoots", "Glowing maternity portraits in golden light or studio sets."),
    ("Cake Smash", "Birthday Photography", "Energetic birthday coverage that captures the chaos and the candles."),
    ("Quiet Joy", "Engagement Shoots", "Intimate engagement portraits to announce your news in style."),
    ("Sacred Light", "Religious Ceremony Coverage", "Respectful, beautifully-lit coverage of religious milestones."),
    ("Two Cultures", "Fusion Wedding Films", "Multi-day, multi-culture wedding films woven into one cohesive story."),
    ("Star-Lit", "Celebrity Coverage", "Discreet, high-end coverage for public figures and their teams."),
    ("Movement", "Dance Films", "Choreography films and reels for performers and academies."),
    ("Performance", "Theatre Documentation", "Multi-cam recording of stage productions for archive and promotion."),
    ("Trial by Lens", "Court & Legal Documentation", "Discreet documentation for legal, archival, and case-related media."),
    ("Beats", "DJ & Concert Films", "High-energy multi-cam coverage of DJ sets, live bands, and tours."),
    ("Behind The Scenes", "BTS Reels", "BTS edits that show your audience how the magic was made."),
    ("Vertical First", "Reels & Shorts", "Native vertical edits optimised for Instagram, TikTok, and YouTube Shorts."),
    ("Wedding-In-A-Day", "Same-Day Edits", "A polished highlight film delivered before the reception ends."),
    ("Drone Mapping", "Real-Estate Cinematography", "Property films and tours that sell luxury listings faster."),
    ("Tasting Notes", "Food & Beverage Films", "Mouth-watering food cinematography for restaurants and brands."),
    ("Mechanical Beauty", "Automotive Cinematography", "Slick car commercials, dealer films, and enthusiast edits."),
    ("Slow Travel", "Travel & Hospitality Films", "Resort, hotel, and travel brand films that sell the feeling."),
    ("Long Hours", "Conference Coverage", "Multi-day conference, summit, and keynote documentation."),
    ("Boardroom Stories", "Annual Report Films", "Executive interview films for investor and stakeholder communication."),
    ("Heartwork", "Charity & NGO Films", "Mission-led non-profit films created at sensitive rates."),
    ("Soft Sell", "Product Films", "Beautifully-lit product films that sell without shouting."),
    ("Soft Glam", "Beauty Shoots", "Editorial beauty stills and motion for cosmetics and salons."),
    ("Mood", "Music Album Artwork", "Cover art, EPK photography, and visualiser content for musicians."),
    ("Voices", "Podcast Video Production", "Multi-cam podcast sets with broadcast audio."),
    ("Open House", "Architecture & Interior Photography", "Crisp, magazine-grade architectural photography."),
    ("Festival Spirit", "Cultural Festival Coverage", "Vibrant, fast-paced festival films with rich documentary detail."),
    ("Inner Studio", "Studio Portraits", "Studio portraiture for actors, athletes, and authors."),
    ("Forever After", "Anniversary Films", "Anniversary edits and remasters for milestone celebrations."),
    ("Goodbye Speeches", "Farewell & Tribute Films", "Heart-led memorial and tribute videos created with care."),
]

BRAND_STATEMENTS = [
    ("Crafting Visual Stories That Last Forever", "Professional Cinematography & Photography Services"),
    ("Every Frame Tells a Story", "We capture the moments that matter most"),
    ("From Concept to Screen", "Full-service production for weddings, events, and brands"),
    ("Where Art Meets Emotion", "Cinematic storytelling that moves hearts"),
    ("Your Story, Our Lens", "Personalised visual narratives for every occasion"),
    ("Filmmakers For Real Life", "Documentary craft for the most important days of your life"),
    ("Made to Be Watched Forever", "Heirloom films, not throwaway content"),
    ("We Don't Direct, We Listen", "Honest storytelling, beautifully made"),
    ("Light, Love, and a Long Lens", "Quietly capturing the loudest moments"),
    ("Cinema In Your Living Room", "Wedding films that play like feature shorts"),
    ("Built On Trust, Run On Craft", "A studio led by repeat referrals"),
    ("Boutique Studio, Big-Screen Polish", "Hand-edited every frame, no factory-line edits"),
    ("Modern Romance, Timeless Frames", "Contemporary cinematography rooted in classic technique"),
    ("Frames That Feel Like Memories", "We shoot for how it felt, not just how it looked"),
    ("A Quiet Crew, A Loud Result", "Invisible on the day, unforgettable on screen"),
    ("Stories, Not Schedules", "We work to your moments, not a stopwatch"),
    ("Light Discipline, Loud Hearts", "Mastering both technique and tenderness"),
    ("Cinematic By Default", "Even the simplest shoots get the big-screen treatment"),
    ("Editing Is Half The Magic", "Months of post for minutes of joy"),
    ("Print Belongs On Walls", "We push for albums and frames, not just hard drives"),
    ("Designed for Re-watching", "Films built to live well over a decade"),
    ("Made With Care, Not With AI", "Hand-crafted edits, real human eyes, every cut"),
    ("Stories Worth Sitting Down For", "Long-form films for those who love to remember"),
    ("Frames Worth Framing", "Stills designed for the wall, not just the feed"),
    ("Family First, Frames Second", "Comfortable shoots make the best photographs"),
    ("Old Souls, New Tools", "Classic eye, modern cameras"),
    ("Director's Eye, Best Friend's Pace", "Cinema craft, no celebrity attitude"),
    ("A Patient Studio In A Fast World", "We take the time your story deserves"),
    ("Where Couples Become Characters", "Wedding films with narrative arcs and emotional beats"),
    ("Stories From The Subcontinent", "Deeply rooted in Indian rituals, globally polished"),
    ("Independent Cinema For Personal Lives", "Auteur sensibilities for private moments"),
    ("Built For Big Days", "Stress-tested across hundreds of weddings"),
    ("Documentary At Heart", "Real moments, never staged"),
    ("Filmmakers, Not Vendors", "We see you as a co-creator, not a client"),
    ("Drone-Ready, Detail-Obsessed", "Sky-wide and stitch-tight, every shoot"),
    ("Sound Design That Sticks", "Films you can listen to with your eyes closed"),
    ("A Studio With A Spine", "We say yes to risk, no to clichés"),
    ("Quiet Confidence In Every Frame", "Crafted, not loud"),
    ("Story First, Tech Second", "Equipment serves the story, never the other way round"),
    ("Heirlooms in 4K", "Future-proof archival, classic emotion"),
]

STATS = [
    (500, "+", "Projects Completed"),
    (350, "+", "Happy Clients"),
    (8, "+", "Years Experience"),
    (25, "+", "Cities Covered"),
    (15, "+", "Awards Won"),
    (12, "+", "Countries Filmed In"),
    (1200, "+", "Hours Of Footage Annually"),
    (40, "+", "Crew Members"),
    (200, "+", "Wedding Films Delivered"),
    (90, "+", "Corporate Clients"),
    (60, "+", "Brand Films Produced"),
    (75, "+", "Music Videos Shot"),
    (300, "+", "Pre-Wedding Sessions"),
    (50, "+", "Drone Pilots Trained"),
    (5, "%", "Of Brides Become Friends"),
    (98, "%", "Repeat Referral Rate"),
    (10, "TB", "Footage Archived Monthly"),
    (4, "K", "Standard Delivery Resolution"),
    (24, "/7", "Support Window"),
    (3, "x", "Backup Redundancy"),
    (15, "+", "Editing Suites"),
    (6, "+", "RED & ARRI Bodies"),
    (10, "+", "Cinema Lenses"),
    (4, "+", "Drone Aircraft"),
    (8, "+", "Audio Recordists"),
    (20, "+", "Colorists & Editors"),
    (150, "+", "Five-Star Reviews"),
    (5, "+", "Magazine Features"),
    (3, "+", "Documentary Premieres"),
    (2, "+", "International Awards"),
    (1, "M+", "Combined Social Reach"),
    (35, "+", "Destination Weddings"),
    (80, "+", "Sangeet & Reception Films"),
    (110, "+", "Engagement Shoots"),
    (45, "+", "Newborn Sessions"),
    (90, "+", "Family Portrait Sessions"),
    (220, "+", "Highlight Reels Edited"),
    (180, "+", "Long-Form Films Edited"),
    (16, "+", "Years Of Combined Experience"),
    (100, "%", "On-Time Delivery"),
]

CTA_HEADINGS = [
    "Ready to Create Something Beautiful?",
    "Let's Tell Your Story",
    "Your Vision, Our Expertise",
    "Capture the Moments That Matter",
    "Transform Your Event Into Art",
    "Let's Make a Film, Not a Video",
    "Big Days Deserve Big Films",
    "From Sangeet To Send-Off, We've Got You",
    "Want a Wedding Film Worth Re-Watching?",
    "Let's Plan Your Pre-Wedding",
    "Hire The Crew Your Cousin Recommended",
    "Limited Dates Each Season — Get In Early",
    "Brands That Trust Us Win Awards",
    "Your Brand Story Starts With One Call",
    "Don't Just Document — Direct",
    "Cinema Begins With A Conversation",
    "Let's Co-Create Your Best Frames",
    "Ready For Big-Screen Quality?",
    "Talk To A Cinematographer, Not A Salesperson",
    "Tell Us Your Dates, We'll Tell Your Story",
    "From Idea To Premiere — We Handle It All",
    "Hire The Studio Couples Re-Hire For Anniversaries",
    "We Travel — Tell Us Where",
    "Let's Outdo Your Pinterest Board",
    "Your Highlight Reel Could Be Trending Next Week",
    "Slow Down Time With Us",
    "Book A Free Consultation Today",
    "Looking For A Wedding Film That Plays Like A Movie?",
    "Build A Brand Story Your Investors Forward",
    "Document The Day Your Family Watches Yearly",
    "Get A Quote In 24 Hours",
    "Reserve Your Date Before Someone Else Does",
    "Want To See Our Sample Films?",
    "Plan A Studio Visit",
    "Bring Your Mood Board, Leave With A Plan",
    "Tell Us About Your Big Day",
    "Got A Corporate Launch Coming Up?",
    "Hosting An Event? Let's Cover It",
    "Need A Music Video Director?",
    "Have A Strange Brief? We Love Those",
]

CTA_BUTTONS = [
    "Book a Session", "Get In Touch", "Start a Project", "Schedule a Call",
    "Request a Quote", "WhatsApp Us", "Email The Studio", "Tell Us More",
    "View Sample Films", "Plan A Visit",
]

SITE_SECTIONS = [
    ("services", "What We Offer", "Our Creative Services"),
    ("portfolio", "Our Work", "Featured Portfolio"),
    ("process", "How We Work", "Our Creative Process"),
    ("testimonials", "Client Love", "What Our Clients Say"),
    ("contact", "Reach Out", "Let's Work Together"),
    ("hero", "Sarkari Shooting", "Cinematic Storytelling Studio"),
    ("about", "Who We Are", "A Boutique Cinematography Studio"),
    ("team", "Meet The Crew", "The People Behind The Lens"),
    ("stats", "By The Numbers", "Eight Years Of Filmmaking"),
    ("quote", "In Their Words", "A Note On Our Craft"),
    ("brand", "Our Promise", "Films Made To Be Re-Watched"),
    ("cta", "Take The Next Step", "Tell Us Your Story"),
    ("weddings", "Big Days", "Wedding Films & Photography"),
    ("prewedding", "Love Stories", "Pre-Wedding Shoots Worldwide"),
    ("events", "Energy & Atmosphere", "Live Event Coverage"),
    ("corporate", "Brand Work", "Corporate Films & Documentaries"),
    ("music-videos", "Sound & Vision", "Music Video Direction"),
    ("destination", "On The Road", "Destination Weddings & Shoots"),
    ("packages", "What's Included", "Studio Packages"),
    ("faqs", "Need To Know", "Frequently Asked Questions"),
    ("blog", "Field Notes", "Stories From The Studio"),
    ("press", "In The Press", "Recent Coverage & Features"),
    ("awards", "Recognition", "Our Awards & Honours"),
    ("gear", "Our Kit", "Cameras, Lenses & Tools"),
    ("studio", "Visit Us", "Our Studio In Jaipur"),
    ("offers", "Limited Slots", "Seasonal Offers & Packages"),
    ("referrals", "Refer A Friend", "Studio Referral Programme"),
    ("careers", "Join The Crew", "Open Positions At The Studio"),
    ("internships", "Learn With Us", "Internship Programme"),
    ("workshops", "Skill Up", "Cinematography Workshops"),
    ("newsletter", "Stay In The Loop", "Studio Newsletter"),
    ("policy", "The Fine Print", "Terms & Privacy Policy"),
    ("locations", "Where We Shoot", "Our Service Areas"),
    ("collaborations", "Partners", "Brand & Vendor Collaborations"),
    ("instagram", "Daily Frames", "Latest On Instagram"),
    ("youtube", "Films On YouTube", "Watch Our Channel"),
    ("podcast", "Audio Stories", "Studio Podcast"),
    ("testimonials-2", "More Love", "More Words From Clients"),
    ("vendors", "Trusted Vendors", "Our Preferred Vendor Network"),
    ("anniversary", "Forever Films", "Anniversary Edits & Remasters"),
]

PORTFOLIO_CATEGORIES = [
    ("Weddings", "weddings"),
    ("Pre-Wedding", "prewedding"),
    ("Events", "events"),
    ("Corporate", "corporate"),
    ("Music Videos", "music-videos"),
    ("Engagement", "engagement"),
    ("Sangeet", "sangeet"),
    ("Reception", "reception"),
    ("Haldi & Mehendi", "haldi-mehendi"),
    ("Destination Weddings", "destination-weddings"),
    ("Royal Weddings", "royal-weddings"),
    ("Intimate Weddings", "intimate-weddings"),
    ("Court Weddings", "court-weddings"),
    ("Christian Weddings", "christian-weddings"),
    ("Sikh Weddings", "sikh-weddings"),
    ("Muslim Weddings", "muslim-weddings"),
    ("Fusion Weddings", "fusion-weddings"),
    ("Couple Portraits", "couple-portraits"),
    ("Family Sessions", "family-sessions"),
    ("Maternity", "maternity"),
    ("Newborn", "newborn"),
    ("Birthday", "birthday"),
    ("Anniversary", "anniversary"),
    ("Brand Films", "brand-films"),
    ("Product Films", "product-films"),
    ("Real Estate", "real-estate"),
    ("Hospitality", "hospitality"),
    ("Travel", "travel"),
    ("Fashion", "fashion"),
    ("Editorial", "editorial"),
    ("Documentary", "documentary"),
    ("Short Films", "short-films"),
    ("Live Concerts", "live-concerts"),
    ("DJ Sets", "dj-sets"),
    ("Festivals", "festivals"),
    ("Conferences", "conferences"),
    ("Charity Events", "charity-events"),
    ("Workshops", "workshops-portfolio"),
    ("Podcast", "podcast-portfolio"),
    ("Behind The Scenes", "behind-the-scenes"),
]

ENQUIRY_MESSAGES = [
    "Hello — we're planning our wedding next December in Udaipur and would love to know your availability and packages.",
    "Hi, looking for a pre-wedding shoot in Manali. Snow season preferred. Please share rates.",
    "Hello team, I'm interested in your corporate film services for our annual conference in Mumbai.",
    "We loved your work on Priya & Rahul's wedding. Can we set up a call to discuss our event?",
    "Hi! Need a music video director for an indie artist's debut release. Tight deadline.",
    "Looking for a maternity + newborn package. Studio is preferred. Open to home sessions too.",
    "Hello, we're hosting a 200-guest engagement and want full coverage including drone.",
    "Need a quick same-day edit for our reception. Please confirm if possible.",
    "Hi! Planning a destination wedding in Goa. Need full team including drone & second shooter.",
    "Hi team, interested in your album printing service. Do you have sample books we can view?",
    "Hello — our brand needs founder portraits and a 90-second brand story film.",
    "We saw your Sangeet film on Instagram and loved it. Can you share your sangeet package?",
    "Looking for a long-form documentary on a family business — 25-minute film. Can you take this on?",
    "Hi, planning a Christian wedding in Goa. Looking for both photo & video coverage.",
    "Need product photography + film for our new D2C launch. Six SKUs.",
    "Hello — Sikh wedding next April in Chandigarh. Three days of events.",
    "Hi, looking for travel film services for our Kerala backwaters property.",
    "Need real-estate cinematography for a luxury apartment listing in Mumbai.",
    "Looking to book a podcast video setup — recurring monthly recording.",
    "Hi — workshop coverage needed for an artist masterclass in Pune.",
    "Hosting an annual charity gala. Need discreet, tasteful coverage.",
    "Need festival coverage for a 3-day cultural festival in Jaipur next October.",
    "Wedding film + photography for an intimate ceremony of 50 guests in Mussoorie.",
    "Looking for a music video shoot in Hampi — atmospheric, sunrise/sunset shots.",
    "Hi, considering a fusion wedding film — Indo-Italian. Have you done one before?",
    "Need anniversary remaster of footage we already shot 5 years ago. Possible?",
    "Looking for a brand campaign — 1 hero film + 6 vertical cut-downs.",
    "Hi! Wedding in Jodhpur. Mehrangarh Fort venue. Need cinematic coverage.",
    "Engagement shoot in Pondicherry — French Quarter aesthetic. Available?",
    "Need a tribute film for my grandfather's 80th birthday. Footage to be sent over.",
    "Looking for a beauty brand shoot — stills + 15-second cutdowns.",
    "Hi, planning a court wedding in Delhi. Just need 2-hour candid photo coverage.",
    "Hello team, please share your wedding package PDFs and 2026 calendar.",
    "Need conference live-stream + multi-cam recording. Hyderabad. October dates.",
    "Hi, we're hosting a launch event for our restaurant chain. Want a food-forward film.",
    "Looking for haldi & mehendi only coverage. Half day. Vibrant editing preferred.",
    "Need automotive cinematography for a new dealership launch. Premium SUVs.",
    "Hi — planning a yoga retreat shoot in Rishikesh. Need calm, meditative cinematography.",
    "Hello, looking for festival-style edit of our 3-day wedding. Energetic, fast-paced.",
    "Need a behind-the-scenes reel for our boutique brand launch.",
]


# ---------------------------------------------------------------------------
# COMMAND
# ---------------------------------------------------------------------------


class Command(BaseCommand):
    help = "Seed 40+ sample records per model for the Sarkari Shooting site."

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Delete existing rows (except SiteSettings) before seeding.",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Seed even if model already has data (skips uniqueness conflicts).",
        )
        parser.add_argument(
            "--no-media",
            action="store_true",
            help="Skip generating placeholder images/videos.",
        )

    # ---- helpers -----------------------------------------------------------

    def _maybe_clear(self, clear: bool):
        if not clear:
            return
        deleted_models = [
            Enquiry, PortfolioItemVideo, PortfolioItemImage, PortfolioItem,
            PortfolioCategory, HeroSlide, BrandStatement, Service, Quote,
            ProcessStep, Testimonial, Stat, CTABanner, SiteSection,
        ]
        for model in deleted_models:
            count = model.objects.count()
            if count:
                model.objects.all().delete()
                self.stdout.write(f"  cleared {count} {model.__name__}")

    def _should_seed(self, model, force: bool, target: int = 40) -> bool:
        if force:
            return True
        return model.objects.count() < target

    # ---- main --------------------------------------------------------------

    def handle(self, *args, **options):
        clear = options.get("clear", False)
        force = options.get("force", False)
        self.media_enabled = not options.get("no_media", False)
        self.sample_video = _find_sample_video() if self.media_enabled else None

        self.stdout.write(self.style.NOTICE("Seeding Sarkari Shooting sample data..."))
        if self.media_enabled:
            if not PIL_AVAILABLE:
                self.stdout.write(self.style.WARNING(
                    "Pillow not installed — image placeholders will be skipped."
                ))
            if self.sample_video is None:
                self.stdout.write(self.style.WARNING(
                    "No sample .mp4 found under MEDIA_ROOT — video placeholders will be empty."
                ))
            else:
                self.stdout.write(f"Using sample video: {self.sample_video.relative_to(settings.MEDIA_ROOT)}")
        else:
            self.stdout.write("Media generation disabled (--no-media).")

        self._maybe_clear(clear)

        self.seed_site_settings()
        self.seed_hero_slides(force)
        self.seed_brand_statements(force)
        self.seed_services(force)
        self.seed_portfolio_categories(force)
        self.seed_portfolio_items(force)
        self.seed_portfolio_gallery_images(force)
        self.seed_portfolio_gallery_videos(force)
        self.seed_quotes(force)
        self.seed_process_steps(force)
        self.seed_testimonials(force)
        self.seed_stats(force)
        self.seed_cta_banners(force)
        self.seed_site_sections(force)
        self.seed_enquiries(force)

        self.stdout.write(self.style.SUCCESS(
            "Done! Log in to /admin/ to swap in your own images/videos when ready."
        ))

    # ---- per-model seeders -------------------------------------------------

    def seed_site_settings(self):
        logo = favicon = ""
        if self.media_enabled and PIL_AVAILABLE:
            logo = _make_image("site/logo.jpg", 512, 160, "Sarkari Shooting", "Cinematography Studio", 0)
            favicon = _make_image("site/favicon.jpg", 128, 128, "SS", "Studio", 1)

        instance = SiteSettings.objects.first()
        if instance is None:
            SiteSettings.objects.create(
                site_name="Sarkari Shooting",
                logo=logo,
                favicon=favicon,
                phone_whatsapp="+91 9XXX XXX XXX",
                studio_address="Sarkari Shooting Studio, Near City Palace, Jaipur, Rajasthan 302001",
                email="info@sarkarishooting.com",
                working_hours="Mon – Sat: 10:00 AM – 8:00 PM",
                whatsapp_url="https://wa.me/919XXXXXXXXX",
                instagram_url="https://instagram.com/sarkarishooting",
                facebook_url="https://facebook.com/sarkarishooting",
                copyright_text="© 2026 — Sarkari Shooting Cinematography. All rights reserved.",
            )
            self.stdout.write(self.style.SUCCESS("Created SiteSettings (singleton)"))
            return

        updated = False
        if logo and not instance.logo:
            instance.logo = logo
            updated = True
        if favicon and not instance.favicon:
            instance.favicon = favicon
            updated = True
        if updated:
            instance.save(update_fields=["logo", "favicon"])
            self.stdout.write(self.style.SUCCESS("Topped up SiteSettings logo/favicon"))

    def seed_hero_slides(self, force: bool):
        if not self._should_seed(HeroSlide, force):
            return
        created = 0
        titles = [
            "Royal Wedding Film", "Pre-Wedding Magic", "Corporate Brilliance",
            "Destination Wedding", "Traditional Elegance", "Beach Romance",
            "Mountain Vows", "Palace Sangeet", "Sunset Engagement",
            "Heritage Reception", "Desert Pheras", "Backwater Story",
            "Snowfall Pre-Wed", "Heirloom Album", "Highland Honeymoon",
            "Mehendi Moments", "Haldi Glow", "Reception Reel",
            "Rooftop Brand Film", "Festival Energy", "Indie Music Video",
            "Studio Beauty Shoot", "Newborn Tenderness", "Maternity Light",
            "Family Portraits", "Birthday Smashes", "Anniversary Remaster",
            "Documentary Premiere", "Corporate Launch", "Drone Showreel",
            "Restaurant Story", "Resort Film", "Real-Estate Tour",
            "Fashion Lookbook", "Workshop Recap", "Podcast Episode",
            "Charity Gala", "Live Concert", "Behind The Scenes",
            "Brand Documentary", "Director's Cut", "Quiet Intimate Wedding",
        ]
        for i, title in enumerate(titles):
            location = LOCATIONS[i % len(LOCATIONS)]
            image_path = ""
            if self.media_enabled and PIL_AVAILABLE:
                image_path = _make_image(
                    f"hero/slide_{i + 1:02d}.jpg",
                    1600, 900,
                    title, f"{location} · {DATES[i % len(DATES)]}", i,
                )
            HeroSlide.objects.create(
                image=image_path,
                location=location,
                date=DATES[i % len(DATES)],
                title=title,
                description=(
                    f"A signature {title.lower()} captured in {location} — "
                    "cinematic storytelling layered with thoughtful sound design and grading."
                ),
                link_text="View Portfolio",
                order=i,
            )
            created += 1
        self.stdout.write(self.style.SUCCESS(f"Created {created} HeroSlides"))

    def seed_brand_statements(self, force: bool):
        if not self._should_seed(BrandStatement, force):
            return
        created = 0
        for i, (headline, tagline) in enumerate(BRAND_STATEMENTS):
            BrandStatement.objects.create(headline=headline, tagline=tagline, order=i)
            created += 1
        self.stdout.write(self.style.SUCCESS(f"Created {created} BrandStatements"))

    def seed_services(self, force: bool):
        if not self._should_seed(Service, force):
            return
        created = 0
        for i, (tag, name, desc) in enumerate(SERVICES):
            icon_path = ""
            if self.media_enabled and PIL_AVAILABLE:
                # Initials for the icon (e.g. "Wedding Cinematography" -> "WC")
                initials = "".join(part[0] for part in name.split() if part)[:3].upper()
                icon_path = _make_image(
                    f"services/icon_{i + 1:02d}.jpg",
                    240, 240,
                    initials, tag, i,
                )
            Service.objects.create(
                icon=icon_path, tag=tag, name=name, description=desc, order=i,
            )
            created += 1
        self.stdout.write(self.style.SUCCESS(f"Created {created} Services"))

    def seed_portfolio_categories(self, force: bool):
        if not self._should_seed(PortfolioCategory, force):
            return
        created = 0
        for i, (name, slug) in enumerate(PORTFOLIO_CATEGORIES):
            PortfolioCategory.objects.get_or_create(
                slug=slug,
                defaults={"name": name, "order": i},
            )
            created += 1
        self.stdout.write(self.style.SUCCESS(f"Seeded {created} PortfolioCategories"))

    def seed_portfolio_items(self, force: bool):
        if not self._should_seed(PortfolioItem, force):
            return
        cats = list(PortfolioCategory.objects.all().order_by("order"))
        if not cats:
            self.stdout.write(self.style.WARNING("Skipped PortfolioItems: no PortfolioCategory exists"))
            return
        created = 0
        for i in range(40):
            first = INDIAN_FIRST_NAMES[i % len(INDIAN_FIRST_NAMES)]
            partner = INDIAN_FIRST_NAMES[(i + 7) % len(INDIAN_FIRST_NAMES)]
            title = f"{first} & {partner}"
            meta = f"{DATES[i % len(DATES)]} · {LOCATIONS[i % len(LOCATIONS)].split(',')[0]}"
            description = (
                f"A {cats[i % len(cats)].name.lower()} story shot in "
                f"{LOCATIONS[i % len(LOCATIONS)]} — emotive, light-led, and crafted to be re-watched."
            )
            image_path = ""
            if self.media_enabled and PIL_AVAILABLE:
                image_path = _make_image(
                    f"portfolio/item_{i + 1:02d}.jpg",
                    1400, 900,
                    title, meta, i,
                )
            PortfolioItem.objects.create(
                category=cats[i % len(cats)],
                image=image_path,
                title=title,
                meta=meta,
                description=description,
                venue=VENUES[i % len(VENUES)],
                tags=f"{cats[i % len(cats)].name}, {LOCATIONS[i % len(LOCATIONS)].split(',')[0]}, Cinematic",
                testimonial_text=(
                    TESTIMONIALS[i % len(TESTIMONIALS)][0] if i % 2 == 0 else ""
                ),
                testimonial_author=(
                    TESTIMONIALS[i % len(TESTIMONIALS)][1] if i % 2 == 0 else ""
                ),
                order=i,
            )
            created += 1
        self.stdout.write(self.style.SUCCESS(f"Created {created} PortfolioItems"))

    def seed_portfolio_gallery_images(self, force: bool):
        if not self._should_seed(PortfolioItemImage, force):
            return
        items = list(PortfolioItem.objects.all().order_by("order"))
        if not items:
            self.stdout.write(self.style.WARNING("Skipped PortfolioItemImages: no PortfolioItems"))
            return
        created = 0
        captions = [
            "First look", "Bridal portrait", "Couple twirl", "Ring close-up",
            "Family blessing", "Pheras frame", "Mehendi hands", "Haldi splash",
            "Sangeet stage", "Reception entry", "Drone wide", "Sunset embrace",
            "Backlit veil", "Father-daughter moment", "Bridesmaids laugh",
            "Groom prep", "Detail flatlay", "Vidaai tears", "Confetti exit",
            "Dance floor",
        ]
        for i in range(40):
            item = items[i % len(items)]
            caption = captions[i % len(captions)]
            rel = f"portfolio/gallery/sample_{i + 1:02d}.jpg"
            if self.media_enabled and PIL_AVAILABLE:
                _make_image(rel, 1200, 800, caption, item.title, i)
            PortfolioItemImage.objects.create(
                portfolio_item=item,
                image=rel,
                caption=caption,
                order=i,
            )
            created += 1
        self.stdout.write(self.style.SUCCESS(f"Created {created} PortfolioItemImages"))

    def seed_portfolio_gallery_videos(self, force: bool):
        if not self._should_seed(PortfolioItemVideo, force):
            return
        items = list(PortfolioItem.objects.all().order_by("order"))
        if not items:
            self.stdout.write(self.style.WARNING("Skipped PortfolioItemVideos: no PortfolioItems"))
            return
        created = 0
        captions = [
            "Highlight trailer", "Long-form film", "Sangeet reel", "Mehendi reel",
            "Drone aerial", "Same-day edit", "Anniversary cut", "BTS reel",
            "Reception toasts", "Pheras film",
        ]
        for i in range(40):
            item = items[i % len(items)]
            rel = f"portfolio/videos/sample_{i + 1:02d}.mp4"
            video_path = rel
            if self.media_enabled and self.sample_video is not None:
                video_path = _make_video(rel, self.sample_video) or rel
            PortfolioItemVideo.objects.create(
                portfolio_item=item,
                video=video_path,
                caption=captions[i % len(captions)],
                order=i,
            )
            created += 1
        note = "" if self.sample_video else " (no source video found — paths only)"
        self.stdout.write(self.style.SUCCESS(f"Created {created} PortfolioItemVideos{note}"))

    def seed_quotes(self, force: bool):
        if not self._should_seed(Quote, force):
            return
        created = 0
        for i, (text, author) in enumerate(PHOTOGRAPHY_QUOTES):
            Quote.objects.create(text=text, author=author, order=i)
            created += 1
        self.stdout.write(self.style.SUCCESS(f"Created {created} Quotes"))

    def seed_process_steps(self, force: bool):
        if not self._should_seed(ProcessStep, force):
            return
        created = 0
        for i, (title, desc) in enumerate(PROCESS_STEPS):
            ProcessStep.objects.create(
                step_number=f"{i + 1:02d}",
                title=title,
                description=desc,
                order=i,
            )
            created += 1
        self.stdout.write(self.style.SUCCESS(f"Created {created} ProcessSteps"))

    def seed_testimonials(self, force: bool):
        if not self._should_seed(Testimonial, force):
            return
        created = 0
        for i, (text, name, title) in enumerate(TESTIMONIALS):
            image_path = ""
            if self.media_enabled and PIL_AVAILABLE:
                initials = "".join(part[0] for part in name.split() if part)[:3].upper()
                image_path = _make_image(
                    f"testimonials/avatar_{i + 1:02d}.jpg",
                    400, 400,
                    initials, name, i,
                )
            Testimonial.objects.create(
                text=text,
                author_name=name,
                author_title=title,
                image=image_path,
                order=i,
            )
            created += 1
        self.stdout.write(self.style.SUCCESS(f"Created {created} Testimonials"))

    def seed_stats(self, force: bool):
        if not self._should_seed(Stat, force):
            return
        created = 0
        for i, (count, suffix, label) in enumerate(STATS):
            Stat.objects.create(count=count, suffix=suffix, label=label, order=i)
            created += 1
        self.stdout.write(self.style.SUCCESS(f"Created {created} Stats"))

    def seed_cta_banners(self, force: bool):
        if not self._should_seed(CTABanner, force):
            return
        created = 0
        for i, heading in enumerate(CTA_HEADINGS):
            image_path = ""
            if self.media_enabled and PIL_AVAILABLE:
                image_path = _make_image(
                    f"cta/banner_{i + 1:02d}.jpg",
                    1600, 800,
                    heading, CTA_BUTTONS[i % len(CTA_BUTTONS)], i,
                )
            CTABanner.objects.create(
                image=image_path,
                heading=heading,
                button_text=CTA_BUTTONS[i % len(CTA_BUTTONS)],
                button_link="",
                order=i,
            )
            created += 1
        self.stdout.write(self.style.SUCCESS(f"Created {created} CTABanners"))

    def seed_site_sections(self, force: bool):
        if not self._should_seed(SiteSection, force):
            return
        created = 0
        for i, (key, eyebrow, heading) in enumerate(SITE_SECTIONS):
            SiteSection.objects.get_or_create(
                section_key=key,
                defaults={"eyebrow_label": eyebrow, "heading": heading, "order": i},
            )
            created += 1
        self.stdout.write(self.style.SUCCESS(f"Seeded {created} SiteSections"))

    def seed_enquiries(self, force: bool):
        if not self._should_seed(Enquiry, force):
            return
        created = 0
        now = timezone.now()
        for i, message in enumerate(ENQUIRY_MESSAGES):
            first = INDIAN_FIRST_NAMES[i % len(INDIAN_FIRST_NAMES)]
            last = INDIAN_LAST_NAMES[i % len(INDIAN_LAST_NAMES)]
            name = f"{first} {last}"
            slug = f"{first}.{last}".lower()
            enquiry = Enquiry.objects.create(
                name=name,
                email=f"{slug}@example.com",
                phone=f"+91 9{(800000000 + i * 137):09d}"[:14],
                event_date=DATES[i % len(DATES)],
                event_location=LOCATIONS[i % len(LOCATIONS)],
                message=message,
                is_read=(i % 3 == 0),
            )
            Enquiry.objects.filter(pk=enquiry.pk).update(
                created_at=now - timedelta(days=i, hours=i % 24)
            )
            created += 1
        self.stdout.write(self.style.SUCCESS(f"Created {created} Enquiries"))
