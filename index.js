/* --- Setup & Canvas Initialization --- */
const canvas = document.getElementById('starsCanvas');
const ctx = canvas.getContext('2d');

/**
 * Resizes the canvas to fill the entire window viewport.
 * Called initially and whenever the window is resized.
 */
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

/**
 * Aligns the floating science icons along the curved edge of the poster arch.
 * It uses the equation of a circle to calculate the horizontal shift required 
 * for an icon based on its vertical position relative to the arch's top radius.
 */
function alignIconsToArch() {
    // R is the radius of the top semicircular arch (300px based on border-radius).
    const R = 300;
    // Minimum gap in pixels between the icon and the arch border.
    const GAP = 12;

    ['left', 'right'].forEach(side => {
        const col = document.querySelector(`.floating-icons.${side}`);
        if (!col) return;
        const containerRect = col.parentElement.getBoundingClientRect();

        col.querySelectorAll('.icon').forEach(icon => {
            const iconRect = icon.getBoundingClientRect();
            // Calculate the Y coordinate of the icon's center relative to the arch container.
            const iconCenterY = (iconRect.top + iconRect.height / 2) - containerRect.top;

            // Calculate horizontal offset to follow the curve using Pythagoras: x = R - sqrt(R^2 - y^2)
            // Only apply the offset if the icon falls within the top curved area (iconCenterY < R).
            const archInset = iconCenterY < R
                ? R - Math.sqrt(R * R - (R - iconCenterY) * (R - iconCenterY))
                : 0;
            const shift = archInset + GAP;
            if (side === 'left') {
                icon.style.marginLeft = `${shift}px`;
                icon.style.marginRight = '';
            } else {
                icon.style.marginRight = `${shift}px`;
                icon.style.marginLeft = '';
            }
        });
    });
}

window.addEventListener('load', alignIconsToArch);
window.addEventListener('resize', alignIconsToArch);
setTimeout(alignIconsToArch, 100);

/* --- Canvas Star Animation Logic --- */

const stars = [];
const numStars = 700;
const maxR = 1500;

// Initialize stars with random polar coordinates (radius and angle)
// to simulate a rotating galaxy background scattered across the canvas.
for (let i = 0; i < numStars; i++) {
    const r = Math.sqrt(Math.random()) * maxR;
    const t = Math.random() * Math.PI * 2;
    stars.push({
        x: r * Math.cos(t),
        y: r * Math.sin(t),
        radius: Math.random() * 1.5,
        baseAlpha: Math.random(),
        twinkleSpeed: 0.01 + Math.random() * 0.03,
        angle: Math.random() * Math.PI * 2,
        color: Math.random() > 0.3 ? '243, 217, 162' : '169, 132, 77'
    });
}

let globalRotation = 0;

/**
 * Main animation loop for the canvas. 
 * Clears the canvas, gently rotates the entire coordinate system to simulate
 * a slowly spinning night sky, and draws each star with a twinkling alpha effect.
 */
function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    globalRotation -= 0.0008;
    ctx.save();
    ctx.translate(canvas.width / 2, -50);
    ctx.rotate(globalRotation);
    for (const star of stars) {
        star.angle += star.twinkleSpeed;
        const alpha = star.baseAlpha + Math.sin(star.angle) * 0.4;
        const boundedAlpha = Math.max(0.05, Math.min(1, alpha));
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${star.color}, ${boundedAlpha})`;
        ctx.fill();
    }
    ctx.restore();
    requestAnimationFrame(animate);
}

animate();

/* --- UI Interactions --- */

/**
 * Switches between upcoming and past talks tabs.
 * @param {string} tabId - The ID prefix of the tab to display ('upcoming' or 'past').
 * @param {Event} event - The click event object to set the active state on the button.
 */
window.switchTab = function (tabId, event) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    document.getElementById('upcoming-talks').style.display = 'none';
    document.getElementById('past-talks').style.display = 'none';
    document.getElementById(tabId + '-talks').style.display = 'block';
};

const calendarDownload = document.getElementById('calendarDownload');
if (calendarDownload) {
    calendarDownload.addEventListener('click', function (e) {
        e.preventDefault();
        const upcomingTalks = document.querySelectorAll('#upcoming-talks .talk');
        let description = "Upcoming Speakers:\\n";
        upcomingTalks.forEach(talk => {
            const title = talk.querySelector('h3').textContent.trim();
            const speaker = talk.querySelector('p').textContent.trim();
            description += `- ${title} // ${speaker}\\n`;
        });
        const rawDate = document.getElementById('eventDate').textContent.trim().replace("'", "20");
        const rawTime = document.getElementById('eventTime').textContent.trim();
        const locationNode = document.querySelector('.location');
        const location = locationNode ? locationNode.textContent.replace(/\s+/g, ' ').trim() : "";
        const startObj = new Date(`${rawDate} ${rawTime}`);
        const endObj = new Date(startObj.getTime() + 1 * 60 * 60 * 1000);

        // Helper function to format JS Date objects into ICS datetime strings (YYYYMMDDTHHMMSSZ)
        const formatICSDate = (d) => {
            if (isNaN(d.getTime())) return "";
            return d.getUTCFullYear() +
                String(d.getUTCMonth() + 1).padStart(2, '0') +
                String(d.getUTCDate()).padStart(2, '0') + 'T' +
                String(d.getUTCHours()).padStart(2, '0') +
                String(d.getUTCMinutes()).padStart(2, '0') +
                String(d.getUTCSeconds()).padStart(2, '0') + 'Z';
        };

        // Build the multiline ICS calendar file content string
        const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Axis Mundi//Science Pub Talks//EN
BEGIN:VEVENT
UID:${Date.now()}@axismundi.science
DTSTAMP:${formatICSDate(new Date())}
DTSTART:${formatICSDate(startObj)}
DTEND:${formatICSDate(endObj)}
SUMMARY:Axis Mundi Science Pub Talks
DESCRIPTION:${description}
LOCATION:${location}
END:VEVENT
END:VCALENDAR`;
        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const tempLink = document.createElement('a');
        tempLink.href = url;
        tempLink.download = "Axis_Mundi_Talks.ics";
        document.body.appendChild(tempLink);
        tempLink.click();
        document.body.removeChild(tempLink);
        URL.revokeObjectURL(url);
    });
}

/**
 * Toggles the visibility of talk abstracts between different languages (e.g., EN/CZ).
 * @param {string} abstractId - The ID of the abstract container.
 * @param {Event} event - The click event to determine the selected language.
 */
window.toggleAbstract = function (abstractId, event) {
    const abstractBox = document.getElementById(abstractId);
    const btns = abstractBox.querySelectorAll('.abstract-toggle-btn');
    const contents = abstractBox.querySelectorAll('.abstract-content');
    const clickedBtn = event.target.closest('.abstract-toggle-btn');
    if (!clickedBtn) return;
    const targetLang = clickedBtn.getAttribute('data-lang');
    btns.forEach(btn => btn.classList.remove('active'));
    clickedBtn.classList.add('active');
    contents.forEach(content => {
        content.classList.toggle('active', content.classList.contains(targetLang));
    });
};

const statusBox = document.getElementById('statusBox');
if (statusBox) {
    let isWaiting = false;
    statusBox.addEventListener('click', function () {
        const en = statusBox.querySelector('.status-en');
        const cz = statusBox.querySelector('.status-cz');
        if (!isWaiting) {
            en.textContent = "we will begin again soon";
            cz.textContent = "Brzy začneme znovu";
            isWaiting = true;
        } else {
            en.textContent = "we will start around 19:15";
            cz.textContent = "Začneme kolem 19:15";
            isWaiting = false;
        }
    });
}

/* --- Lightbox Logic --- */

const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const lightboxCaption = document.getElementById('lightbox-caption');
const lightboxClose = document.querySelector('.lightbox-close');
const lightboxPrev = document.querySelector('.lightbox-prev');
const lightboxNext = document.querySelector('.lightbox-next');

let currentIndex = 0;
let lightboxItems = [];

/**
 * Updates the lightbox image and caption based on the currently selected index.
 * Handles the fade transition effect when switching images.
 */
function updateLightbox() {
    const item = lightboxItems[currentIndex];
    if (!item) return;
    lightboxImg.style.opacity = '0';
    setTimeout(() => {
        lightboxImg.src = item.src;
        lightboxCaption.textContent = item.caption;
        lightboxImg.style.opacity = '1';
    }, 200);
    const hasMultiple = lightboxItems.length > 1;
    lightboxPrev.style.display = hasMultiple ? 'block' : 'none';
    lightboxNext.style.display = hasMultiple ? 'block' : 'none';
}

/**
 * Opens the lightbox and displays the clicked image.
 * Locks body scrolling to prevent background scrolling while the lightbox is open.
 * Filters the navigable images to only include those in the same gallery ID segment.
 * @param {HTMLElement} triggerElement - The clicked lightbox trigger element.
 */
function openLightbox(triggerElement) {
    const galleryId = triggerElement.getAttribute('data-gallery-id');
    const allTriggers = Array.from(document.querySelectorAll('.lightbox-trigger'));
    const filteredTriggers = allTriggers.filter(t => t.getAttribute('data-gallery-id') === galleryId);

    lightboxItems = filteredTriggers.map(t => ({
        src: t.getAttribute('data-image') || t.querySelector('img')?.src,
        caption: t.getAttribute('data-caption') || t.querySelector('img')?.alt || ''
    }));

    currentIndex = filteredTriggers.indexOf(triggerElement);
    if (currentIndex === -1) currentIndex = 0;

    updateLightbox();
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
}

/**
 * Closes the lightbox and restores normal page scrolling.
 */
function closeLightbox() {
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
}

function showNext() {
    currentIndex = (currentIndex + 1) % lightboxItems.length;
    updateLightbox();
}

function showPrev() {
    currentIndex = (currentIndex - 1 + lightboxItems.length) % lightboxItems.length;
    updateLightbox();
}

/**
 * Scans the document for lightbox trigger elements, and attaches click listeners 
 * to open the lightbox filtered by their event gallery segments.
 */
function initLightbox() {
    const triggers = document.querySelectorAll('.lightbox-trigger');
    triggers.forEach(trigger => {
        trigger.onclick = () => openLightbox(trigger);
    });
}

if (lightbox) {
    lightboxClose.onclick = closeLightbox;
    lightboxPrev.onclick = (e) => { e.stopPropagation(); showPrev(); };
    lightboxNext.onclick = (e) => { e.stopPropagation(); showNext(); };
    lightbox.onclick = (e) => { if (e.target === lightbox || e.target.classList.contains('lightbox-content')) closeLightbox(); };
    document.onkeydown = (e) => {
        if (!lightbox.classList.contains('active')) return;
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowRight') showNext();
        if (e.key === 'ArrowLeft') showPrev();
    };
    initLightbox();
}
/* --- Past Events Logic --- */

const PAST_EVENTS_CONFIG = {
    event2: {
        date: "May 22, 2026",
        talks: [
            {
                title: "Accreting supermassive black holes and dark energy",
                speaker: "Bożena Czerny, Center for Theoretical Physics, PAN",
                slides: "",
                abstractEn: "Astronomers are steadily mapping the visible Universe by cataloging stars and galaxies. Yet the evolution of the Universe is governed largely by two invisible components: dark matter and dark energy. Dark matter shapes the formation of galaxies, while dark energy drives the accelerated expansion of the Universe. In this talk, I will focus on dark energy and explain how we use quasars — extraordinarily luminous galaxies powered by accretion onto supermassive black holes — to trace the expansion history of the Universe.",
            },
            {
                title: "What do cosmic beasts look like through computers",
                speaker: "Samik Mitra, International Centre for Theoretical Sciences",
                slides: "",
                abstractEn: "Black holes are often imagined as invisible monsters that swallow everything around them. But through computer simulations, these cosmic beasts become alive: glowing whirlpools of hot plasma, twisted magnetic fields, turbulent storms, and powerful jets. In this talk, we will take a visual journey into how astrophysicists use supercomputers to model the extreme environments around black holes, including the giant black hole at the centre of our Galaxy. We cannot place a black hole in a laboratory, but with equations, physics, and computation, we can watch how these cosmic engines feed, flicker, and shape their surroundings",
            }
        ]
    },
    event1: {
        date: "April 27, 2026",
        talks: [
            {
                title: "Artemis Mission",
                speaker: "Barbora Hudáčková, MUNI",
                slides: "assets/Slides/Artemis Mission 2026-04-27.pptx",
                abstractEn: "With the recent success of the Artemis II mission, the next era of human space exploration is officially underway. This presentation explores the goals and timeline of NASA’s Artemis program, detailing our shift from simply visiting the Moon to establishing a sustained human presence. We will break down the cutting-edge hardware driving these missions, contrasting NASA's Space Launch System (SLS) and Orion spacecraft with the innovative commercial landers developed by SpaceX and Blue Origin. Along with highlighting key moments and new imagery from the Artemis II crewed flyby, we will look ahead to the upcoming surface missions and the development of lunar infrastructure.",
                abstractCz: "S nedávným úspěchem mise Artemis II oficiálně odstartovala nová éra pilotovaného průzkumu vesmíru. Tato prezentace zkoumá cíle a harmonogram programu Artemis od NASA a detailně přibližuje náš posun od pouhých návštěv Měsíce k vybudování trvalé lidské přítomnosti. Podrobně rozebereme špičkové technologie, které tyto mise umožňují, a porovnáme nosnou raketu Space Launch System (SLS) a kosmickou loď Orion z dílny NASA s inovativními komerčními přistávacími moduly od společností SpaceX a Blue Origin. Kromě připomenutí klíčových okamžiků a představení nových snímků z pilotovaného obletu mise Artemis II se podíváme také do budoucnosti na nadcházející povrchové mise a budování lunární infrastruktury."
            },
            {
                title: "Nanomateriály: malé věci, velké změny",
                speaker: "Eliška Birgusová, MENDELU",
                slides: "",
                abstractEn: "What if materials were thousands of times smaller than the width of a human hair — yet capable of transforming how we grow food or protect the environment? Nanomaterials open the door to an invisible world with enormous potential to shape our future. At this tiny scale, materials begin to behave in surprising ways — becoming more reactive, more sensitive, and able to detect what remains hidden to us. In this talk, we will explore the fascinating world of nanomaterials and discover why they are considered one of the most promising tools of modern science. We will look at their potential in sustainable agriculture, food safety, and environmental monitoring. And it won’t stay theoretical — we will also share real examples from research at Mendel University, where nanomaterials are used to “listen” to plants through sensors and better understand the world around them.",
                abstractCz: "Co kdyby materiály byly tisíckrát menší než tloušťka lidského vlasu a přesto dokázaly změnit způsob, jak pěstujeme potraviny nebo chráníme životní prostředí? Nanomateriály představují svět, který běžně nevidíme, ale který má obrovský potenciál ovlivnit naši budoucnost. Právě na této miniaturní škále se totiž materiály začínají chovat úplně jinak — reagují rychleji, jsou citlivější a dokážou „vidět“ věci, které nám zůstávají skryté. V této přednášce se společně podíváme do neviditelného světa nanomateriálů a ukážeme si, proč dnes patří mezi největší naděje moderní vědy. Zaměříme se na jejich možné využití v udržitelném zemědělství, bezpečnosti potravin i ochraně životního prostředí. A nezůstane jen u teorie — představíme si i konkrétní příklady z výzkumu Mendelovy univerzity, kde nanomateriály pomáhají například „naslouchat“ rostlinám pomocí senzorů nebo sledovat, co se děje v jejich okolí."
            }
        ]
    }
};

function renderPastEvents() {
    const root = document.getElementById('past-events-root');
    if (!root) return;

    Object.keys(PAST_EVENTS_CONFIG).forEach(eventId => {
        const event = PAST_EVENTS_CONFIG[eventId];

        const card = document.createElement('div');
        card.className = 'past-event-card';
        card.setAttribute('data-event-id', eventId);

        const header = document.createElement('div');
        header.className = 'past-event-date-header';
        header.textContent = event.date;
        card.appendChild(header);

        event.talks.forEach((talk, talkIdx) => {
            const box = document.createElement('div');
            box.className = 'past-talk-box';

            // Set dataset attributes for interactive modal compatibility
            box.setAttribute('data-event-id', eventId);
            box.setAttribute('data-talk-idx', talkIdx);
            box.setAttribute('data-title', talk.title);
            box.setAttribute('data-speaker', talk.speaker);
            box.setAttribute('data-abstract-en', talk.abstractEn);
            box.setAttribute('data-abstract-cz', talk.abstractCz);
            box.setAttribute('data-slides', talk.slides || '#');

            const titleDiv = document.createElement('div');
            titleDiv.className = 'past-talk-title';
            titleDiv.textContent = talk.title;

            const speakerDiv = document.createElement('div');
            speakerDiv.className = 'past-talk-speaker';
            speakerDiv.textContent = talk.speaker;

            box.appendChild(titleDiv);
            box.appendChild(speakerDiv);
            card.appendChild(box);
        });

        root.appendChild(card);
    });
}

/* --- Gallery Logic --- */

const GALLERY_CONFIG = [
    {
        id: "event2",
        date: "22-05-2026",
        folder: "assets/images/22-05-2026",
        images: [
            ""
        ]
    },
    {
        id: "event1",
        date: "27-04-2026",
        folder: "assets/images/27-04-2026",
        images: [
            "20260427_191933.webp",
            "IMG_0894.webp",
            "IMG_0899.webp",
            "IMG_0906.webp",
            "IMG_0907.webp"
        ]
    }
];

/**
 * Formats a DD-MM-YYYY date string into a more readable format (e.g., Month DD, YYYY).
 * @param {string} dateStr - Date string in DD-MM-YYYY format.
 * @returns {string} The formatted date string.
 */
function formatDate(dateStr) {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const month = months[parseInt(parts[1]) - 1];
    return month ? `${month} ${parseInt(parts[0])}, ${parts[2]}` : dateStr;
}

/**
 * Dynamically generates and renders the gallery DOM elements based on the GALLERY_CONFIG.
 * Creates sections for each date, grid layouts for images, and expand/collapse toggles.
 */
function renderGallery() {
    const root = document.getElementById('gallery-root');
    if (!root) return;
    GALLERY_CONFIG.forEach(event => {
        if (event.images.length === 0) return;
        const section = document.createElement('div');
        section.className = 'gallery-date-section';

        const headerRow = document.createElement('div');
        headerRow.className = 'gallery-header-row';

        const h2 = document.createElement('h2');
        h2.className = 'gallery-date';
        h2.textContent = event.date.includes('-') ? formatDate(event.date) : event.date;

        headerRow.appendChild(h2);
        section.appendChild(headerRow);

        const grid = document.createElement('div');
        grid.className = 'photo-grid';

        event.images.forEach(imgName => {
            if (!imgName || imgName.trim() === "") return; // Skip empty image placeholders
            const path = `${event.folder}/${imgName}`;
            const item = document.createElement('div');
            item.className = 'photo-item lightbox-trigger';
            item.setAttribute('data-image', path);
            item.setAttribute('data-caption', h2.textContent);
            item.setAttribute('data-gallery-id', event.id || event.date); // Grouping key for segemented switching

            const img = document.createElement('img');
            img.src = path;
            img.alt = h2.textContent;
            item.appendChild(img);
            grid.appendChild(item);
        });

        section.appendChild(grid);

        // Collapse/Expand Button at the bottom
        const toggleContainer = document.createElement('div');
        toggleContainer.className = 'gallery-toggle-container';

        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'gallery-toggle-btn';
        toggleBtn.textContent = 'Expand';

        let isCollapsed = true;
        grid.style.maxHeight = '400px';

        toggleBtn.addEventListener('click', () => {
            if (isCollapsed) {
                // Expand
                grid.style.maxHeight = grid.scrollHeight + 'px';
                grid.style.opacity = '1';
                isCollapsed = false;
                toggleBtn.textContent = 'Collapse';
                // After animation, remove max-height so new content can flow
                setTimeout(() => { if (!isCollapsed) grid.style.maxHeight = 'none'; }, 600);
            } else {
                // Collapse: first set explicit max-height, then shrink
                grid.style.maxHeight = grid.scrollHeight + 'px';
                // Force reflow
                grid.offsetHeight;
                grid.style.maxHeight = '400px';
                grid.style.opacity = '1'; // Keep images visible but limited
                isCollapsed = true;
                toggleBtn.textContent = 'Expand';
            }
        });

        toggleContainer.appendChild(toggleBtn);
        section.appendChild(toggleContainer);

        root.appendChild(section);
    });
    initLightbox();
}

/* --- Event Modal Logic --- */

/**
 * Initializes the "Past Events" interactive modal.
 * Attaches click listeners to event boxes, populates modal content dynamically,
 * and handles the embedding of PowerPoint presentation slides via Office Viewer.
 */
function initEventModal() {
    const eventModal = document.getElementById('event-modal');
    if (!eventModal) return;

    const modalTitle = document.getElementById('modal-title');
    const modalSpeaker = document.getElementById('modal-speaker');
    const modalAbstractEn = document.getElementById('modal-abstract-en');
    const modalAbstractCz = document.getElementById('modal-abstract-cz');
    const modalAbstractSection = document.getElementById('modal-abstract-section');
    const modalSlidesContainer = document.getElementById('modal-slides-container');
    const slidesIframe = document.getElementById('slides-iframe');
    const viewSlidesBtn = document.getElementById('view-slides-btn');
    const viewAbstractBtn = document.getElementById('view-abstract-btn');
    const downloadSlidesBtn = document.getElementById('modal-slides-download');
    const modalClose = document.getElementById('modal-close');
    const abstractToggle = document.getElementById('modal-abstract-toggle');

    const pastTalkBoxes = document.querySelectorAll('.past-talk-box');

    pastTalkBoxes.forEach(box => {
        box.addEventListener('click', () => {
            const title = box.getAttribute('data-title');
            const speaker = box.getAttribute('data-speaker');
            const abstractEn = box.getAttribute('data-abstract-en');
            const abstractCz = box.getAttribute('data-abstract-cz');
            const slidesUrl = box.getAttribute('data-slides');

            modalTitle.textContent = title;
            modalSpeaker.textContent = speaker;
            modalAbstractEn.textContent = abstractEn;
            modalAbstractCz.textContent = abstractCz;

            // Reset modal state
            const container = eventModal.querySelector('.event-modal-container');
            container.classList.remove('expanded');
            modalAbstractSection.style.display = 'block';
            modalSlidesContainer.style.display = 'none';
            slidesIframe.src = '';
            if (viewAbstractBtn) viewAbstractBtn.style.display = 'none';

            if (slidesUrl && slidesUrl !== '#') {
                viewSlidesBtn.style.display = 'inline-flex';
                downloadSlidesBtn.style.display = 'inline-flex';
                downloadSlidesBtn.href = slidesUrl;

                // Store slides URL for the viewer
                viewSlidesBtn.onclick = () => {
                    container.classList.add('expanded');
                    modalAbstractSection.style.display = 'none';
                    modalSlidesContainer.style.display = 'block';
                    viewSlidesBtn.style.display = 'none';
                    if (viewAbstractBtn) viewAbstractBtn.style.display = 'inline-flex';

                    // Construct Office Viewer URL
                    let publicUrl;
                    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                        // Fallback for local development: Use the public GitHub URL
                        const repoBase = "https://raw.githubusercontent.com/vasu17/Weird-science-club-website/main/";
                        publicUrl = repoBase + slidesUrl;
                    } else {
                        // Production URL
                        publicUrl = window.location.origin + '/' + slidesUrl;
                    }

                    slidesIframe.src = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(publicUrl)}`;
                };
            } else {
                viewSlidesBtn.style.display = 'none';
                downloadSlidesBtn.style.display = 'none';
            }

            // Show modal — lock background scroll
            eventModal.classList.add('active');
            document.body.style.overflow = 'hidden';
            document.documentElement.style.overflow = 'hidden';

            // Reset abstract toggle to English and toggle Czech visibility
            if (abstractToggle) {
                const hasCz = abstractCz && abstractCz !== 'undefined' && abstractCz.trim() !== '';
                if (hasCz) {
                    abstractToggle.style.display = 'inline-flex';
                } else {
                    abstractToggle.style.display = 'none';
                }

                abstractToggle.querySelectorAll('.abstract-toggle-btn').forEach(btn => {
                    btn.classList.toggle('active', btn.getAttribute('data-lang') === 'en');
                });
                modalAbstractEn.classList.add('active');
                modalAbstractCz.classList.remove('active');
            }
        });
    });

    if (viewAbstractBtn) {
        viewAbstractBtn.onclick = () => {
            const container = eventModal.querySelector('.event-modal-container');
            container.classList.remove('expanded');
            modalAbstractSection.style.display = 'block';
            modalSlidesContainer.style.display = 'none';
            viewSlidesBtn.style.display = 'inline-flex';
            viewAbstractBtn.style.display = 'none';
        };
    }

    if (modalClose) {
        modalClose.onclick = () => {
            eventModal.classList.remove('active');
            document.body.style.overflow = '';
            document.documentElement.style.overflow = ''; // restore html scroll
            slidesIframe.src = ''; // Stop iframe content
        };
    }

    if (abstractToggle) {
        abstractToggle.onclick = (e) => {
            const btn = e.target.closest('.abstract-toggle-btn');
            if (!btn) return;

            const lang = btn.getAttribute('data-lang');

            abstractToggle.querySelectorAll('.abstract-toggle-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            if (lang === 'en') {
                modalAbstractEn.classList.add('active');
                modalAbstractCz.classList.remove('active');
            } else {
                modalAbstractEn.classList.remove('active');
                modalAbstractCz.classList.add('active');
            }
        };
    }

    // Close on background click
    eventModal.onclick = (e) => {
        if (e.target === eventModal || e.target.classList.contains('event-modal-container')) {
            eventModal.classList.remove('active');
            document.body.style.overflow = '';
            document.documentElement.style.overflow = ''; // restore html scroll
        }
    };
}

/**
 * Initializes the "Join the Mailing List" expandable form and animation states.
 */
function initMailingList() {
    const mailingListBtn = document.getElementById('mailingListBtn');
    const mailingListFormContainer = document.getElementById('mailingListFormContainer');
    const mailingListForm = document.getElementById('mailingListForm');
    const mailingSuccessMsg = document.getElementById('mailingSuccessMsg');

    if (mailingListBtn && mailingListFormContainer) {
        mailingListBtn.addEventListener('click', () => {
            mailingListFormContainer.classList.toggle('active');
            if (mailingListFormContainer.classList.contains('active')) {
                // Focus the email input once the expansion transition completes
                const input = mailingListFormContainer.querySelector('.mailing-input-name') || mailingListFormContainer.querySelector('.emailoctopus-input');
                if (input) {
                    setTimeout(() => input.focus(), 300);
                }
            }
        });
    }

    if (mailingListForm && mailingSuccessMsg) {
        mailingListForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const nameInput = mailingListForm.querySelector('.mailing-input-name');
            const emailInput = mailingListForm.querySelector('.mailing-input-email');
            const name = nameInput ? nameInput.value : '';
            const email = emailInput ? emailInput.value : '';
            console.log(`Subscribed: ${name} <${email}>`);

            // Smoothly fade out the form elements
            mailingListForm.style.transition = 'opacity 0.3s ease';
            mailingListForm.style.opacity = '0';

            setTimeout(() => {
                mailingListForm.style.display = 'none';
                mailingSuccessMsg.style.display = 'block';
                mailingSuccessMsg.style.opacity = '0';

                // Force layout reflow for animation trigger
                mailingSuccessMsg.offsetHeight;

                // Fade in the success message
                mailingSuccessMsg.style.transition = 'opacity 0.5s ease';
                mailingSuccessMsg.style.opacity = '1';
            }, 300);
        });
    }
}

window.addEventListener('DOMContentLoaded', () => {
    renderGallery();
    renderPastEvents();
    initEventModal();
    initMailingList();
});
