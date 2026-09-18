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
            "_MG_1063.JPG",
            "_MG_1064.JPG",
            "_MG_1058.JPG",
            "_MG_1060.JPG",
            "_MG_1065.JPG",
            "_MG_1066.JPG",
            "_MG_1068.JPG",
            "_MG_1069.JPG",
            "_MG_1073.JPG",
            "_MG_1075.JPG"
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
    init3DCalabiYauBackground();
    initFeynmanDiagrams();
});

/* --- 3D Calabi-Yau Manifold Background Simulation Engine --- */
function init3DCalabiYauBackground() {
    const canvas = document.getElementById('starsCanvas');
    if (!canvas) return;

    const gl = canvas.getContext('webgl', { antialias: true, alpha: false, powerPreference: 'high-performance' }) ||
               canvas.getContext('experimental-webgl');
    if (!gl) {
        console.warn('WebGL not supported, Calabi-Yau background disabled.');
        return;
    }

    // Determine the Calabi-Yau manifold variety and dimensional parametrization per page
    const pageName = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();

    // 5 Distinct Mathematical Parametrizations with Vibrant Celestial Palettes
    let config = {
        name: 'Fermat Quintic Threefold',
        type: 0, // Hanson Fermat Hypersurface in CP^4
        n: 5,
        numSheets: 25,
        density: 22,
        uMin: 0.0, uMax: Math.PI / 2.0,
        vMin: -1.15, vMax: 1.15,
        baseColor: [0.82, 0.62, 0.16], // Rich Luminous Astral Gold
        glowColor: [1.0, 0.88, 0.40], // Radiant Solar Corona
        gridColor: [0.98, 0.82, 0.38],
        camDist: 3.4,
        scale: 0.66,
        rotSpeed: 0.12,
        alphaSpeed: 0.08
    };

    if (pageName.includes('past_events')) {
        config = {
            name: 'Toric Conifold Fibration',
            type: 1, // Toric T^2 x S^2 Fibration with Conifold Modulus Deformation
            n: 3,
            numSheets: 4,
            density: 34,
            uMin: 0.0, uMax: Math.PI * 2.0,
            vMin: 0.0, vMax: Math.PI * 2.0,
            baseColor: [0.15, 0.52, 0.92], // Vibrant Quantum Sapphire
            glowColor: [0.35, 0.85, 1.0], // Electric Cyan Glow
            gridColor: [0.45, 0.90, 1.0],
            camDist: 3.4,
            scale: 0.64,
            rotSpeed: 0.10,
            alphaSpeed: 0.07
        };
    } else if (pageName.includes('team')) {
        config = {
            name: 'Kummer Quartic / K3 Surface',
            type: 2, // Algebraic Kummer Surface with 16 Nodal Singular Cycles
            n: 4,
            numSheets: 4,
            density: 34,
            uMin: -Math.PI, uMax: Math.PI,
            vMin: -Math.PI, vMax: Math.PI,
            baseColor: [0.82, 0.22, 0.48], // Vibrant Rose-Gold & Ruby
            glowColor: [1.0, 0.45, 0.72], // Radiant Coral
            gridColor: [1.0, 0.55, 0.78],
            camDist: 3.3,
            scale: 0.64,
            rotSpeed: 0.11,
            alphaSpeed: 0.08
        };
    } else if (pageName.includes('gallery')) {
        config = {
            name: '6D Clifford-Hopf Projection',
            type: 3, // Clifford-Hopf S^5/CY 6-Harmonic Compactification
            n: 6,
            numSheets: 6,
            density: 32,
            uMin: 0.0, uMax: Math.PI * 2.0,
            vMin: -Math.PI / 2.0, vMax: Math.PI / 2.0,
            baseColor: [0.10, 0.72, 0.52], // Vibrant Emerald Jade
            glowColor: [0.28, 1.0, 0.80], // Bioluminescent Teal
            gridColor: [0.40, 1.0, 0.82],
            camDist: 3.4,
            scale: 0.66,
            rotSpeed: 0.12,
            alphaSpeed: 0.09
        };
    } else if (pageName.includes('club')) {
        config = {
            name: 'Complete Intersection (CICY)',
            type: 4, // CICY Bi-degree Hypersurface in CP^3 x CP^1
            n: 4,
            numSheets: 16,
            density: 24,
            uMin: 0.0, uMax: Math.PI,
            vMin: 0.0, vMax: Math.PI,
            baseColor: [0.62, 0.22, 0.95], // Vibrant Royal Amethyst
            glowColor: [0.88, 0.52, 1.0], // Electric Lavender
            gridColor: [0.85, 0.48, 1.0],
            camDist: 3.4,
            scale: 0.64,
            rotSpeed: 0.10,
            alphaSpeed: 0.07
        };
    }

    // --- Minimal 4x4 Matrix Utilities ---
    const Mat4 = {
        identity: function (out) {
            for (let i = 0; i < 16; i++) out[i] = (i % 5 === 0) ? 1.0 : 0.0;
            return out;
        },
        perspective: function (out, fovy, aspect, near, far) {
            const f = 1.0 / Math.tan(fovy / 2);
            const nf = 1.0 / (near - far);
            out[0] = f / aspect; out[1] = 0; out[2] = 0; out[3] = 0;
            out[4] = 0; out[5] = f; out[6] = 0; out[7] = 0;
            out[8] = 0; out[9] = 0; out[10] = (far + near) * nf; out[11] = -1;
            out[12] = 0; out[13] = 0; out[14] = (2 * far * near) * nf; out[15] = 0;
            return out;
        },
        lookAt: function (out, eye, center, up) {
            let z0 = eye[0] - center[0], z1 = eye[1] - center[1], z2 = eye[2] - center[2];
            let len = 1 / Math.hypot(z0, z1, z2);
            z0 *= len; z1 *= len; z2 *= len;

            let x0 = up[1] * z2 - up[2] * z1, x1 = up[2] * z0 - up[0] * z2, x2 = up[0] * z1 - up[1] * z0;
            len = Math.hypot(x0, x1, x2);
            if (!len) { x0 = 0; x1 = 0; x2 = 0; } else { len = 1 / len; x0 *= len; x1 *= len; x2 *= len; }

            let y0 = z1 * x2 - z2 * x1, y1 = z2 * x0 - z0 * x2, y2 = z0 * x1 - z1 * x0;
            len = Math.hypot(y0, y1, y2);
            if (!len) { y0 = 0; y1 = 0; y2 = 0; } else { len = 1 / len; y0 *= len; y1 *= len; y2 *= len; }

            out[0] = x0; out[1] = y0; out[2] = z0; out[3] = 0;
            out[4] = x1; out[5] = y1; out[6] = z1; out[7] = 0;
            out[8] = x2; out[9] = y2; out[10] = z2; out[11] = 0;
            out[12] = -(x0 * eye[0] + x1 * eye[1] + x2 * eye[2]);
            out[13] = -(y0 * eye[0] + y1 * eye[1] + y2 * eye[2]);
            out[14] = -(z0 * eye[0] + z1 * eye[1] + z2 * eye[2]);
            out[15] = 1;
            return out;
        },
        multiply: function (out, a, b) {
            let a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
            let a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
            let a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
            let a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

            for (let i = 0; i < 4; i++) {
                let b0 = b[i * 4], b1 = b[i * 4 + 1], b2 = b[i * 4 + 2], b3 = b[i * 4 + 3];
                out[i * 4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
                out[i * 4 + 1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
                out[i * 4 + 2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
                out[i * 4 + 3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
            }
            return out;
        },
        rotateX: function (out, a, rad) {
            let s = Math.sin(rad), c = Math.cos(rad);
            let a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
            let a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
            if (a !== out) {
                out[0] = a[0]; out[1] = a[1]; out[2] = a[2]; out[3] = a[3];
                out[12] = a[12]; out[13] = a[13]; out[14] = a[14]; out[15] = a[15];
            }
            out[4] = a10 * c + a20 * s; out[5] = a11 * c + a21 * s;
            out[6] = a12 * c + a22 * s; out[7] = a13 * c + a23 * s;
            out[8] = a20 * c - a10 * s; out[9] = a21 * c - a11 * s;
            out[10] = a22 * c - a12 * s; out[11] = a23 * c - a13 * s;
            return out;
        },
        rotateY: function (out, a, rad) {
            let s = Math.sin(rad), c = Math.cos(rad);
            let a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
            let a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
            if (a !== out) {
                out[4] = a[4]; out[5] = a[5]; out[6] = a[6]; out[7] = a[7];
                out[12] = a[12]; out[13] = a[13]; out[14] = a[14]; out[15] = a[15];
            }
            out[0] = a00 * c - a20 * s; out[1] = a01 * c - a21 * s;
            out[2] = a02 * c - a22 * s; out[3] = a03 * c - a23 * s;
            out[8] = a00 * s + a20 * c; out[9] = a01 * s + a21 * c;
            out[10] = a02 * s + a22 * c; out[11] = a03 * s + a23 * c;
            return out;
        },
        rotateZ: function (out, a, rad) {
            let s = Math.sin(rad), c = Math.cos(rad);
            let a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
            let a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
            if (a !== out) {
                out[8] = a[8]; out[9] = a[9]; out[10] = a[10]; out[11] = a[11];
                out[12] = a[12]; out[13] = a[13]; out[14] = a[14]; out[15] = a[15];
            }
            out[0] = a00 * c + a10 * s; out[1] = a01 * c + a11 * s;
            out[2] = a02 * c + a12 * s; out[3] = a03 * c + a13 * s;
            out[4] = a10 * c - a00 * s; out[5] = a11 * c - a01 * s;
            out[6] = a12 * c - a02 * s; out[7] = a13 * c - a03 * s;
            return out;
        }
    };

    // --- Shaders Supporting 5 Dimensional Parametrizations ---
    const vsSource = `
        precision highp float;
        attribute vec2 a_coord;
        attribute vec2 a_sheet;

        uniform mat4 u_mvp;
        uniform mat4 u_model;
        uniform float u_n;
        uniform float u_alpha;
        uniform float u_scale;
        uniform int u_type; // 0: Fermat Quintic, 1: Toric Conifold, 2: Kummer Quartic, 3: Clifford-Hopf, 4: CICY

        varying vec3 v_normal;
        varying vec3 v_worldPos;
        varying vec2 v_uv;
        varying vec2 v_sheet;

        float cosh_val(float val) {
            float e = exp(clamp(val, -8.0, 8.0));
            return 0.5 * (e + 1.0 / e);
        }

        float sinh_val(float val) {
            float e = exp(clamp(val, -8.0, 8.0));
            return 0.5 * (e - 1.0 / e);
        }

        // 0. Hanson Fermat Hypersurface
        vec3 evalFermat(float x, float y, float k1, float k2, float n, float a) {
            float cy = cosh_val(y);
            float sy = sinh_val(y);

            float u1 = cos(x) * cy;
            float v1 = -sin(x) * sy;
            float r1 = sqrt(u1 * u1 + v1 * v1);
            float theta1 = atan(v1, u1);

            float u2 = sin(x) * cy;
            float v2 = cos(x) * sy;
            float r2 = sqrt(u2 * u2 + v2 * v2);
            float theta2 = atan(v2, u2);

            float p1 = pow(max(r1, 1e-5), 2.0 / n);
            float phi1 = (2.0 * theta1 + 6.2831853 * k1) / n;
            float re_z1 = p1 * cos(phi1);
            float im_z1 = p1 * sin(phi1);

            float p2 = pow(max(r2, 1e-5), 2.0 / n);
            float phi2 = (2.0 * theta2 + 6.2831853 * k2) / n;
            float re_z2 = p2 * cos(phi2);
            float im_z2 = p2 * sin(phi2);

            return vec3(re_z1, re_z2, im_z1 * cos(a) + im_z2 * sin(a));
        }

        // 1. Toric Conifold Fibration (Past Events)
        vec3 evalToricConifold(float u, float v, float k1, float k2, float a) {
            float mu = 0.32 * cos(a * 0.85);
            float r1 = 1.0 + mu * cos(3.0 * u + k1 * 1.5707963);
            float r2 = 0.45 + 0.22 * sin(3.0 * v);
            
            float x1 = (r1 + r2 * cos(v)) * cos(u) + 0.12 * cos(4.0 * u + a);
            float x2 = (r1 + r2 * cos(v)) * sin(u) + 0.12 * sin(4.0 * u + a);
            float x3 = r2 * sin(v) * cos(u) + mu * sin(3.0 * u + 2.0 * v) * sin(a);
            float x4 = r2 * sin(v) * sin(u) + mu * cos(3.0 * u + 2.0 * v) * cos(a);
            
            return vec3(x1, x2, x3 * cos(a * 0.5) + x4 * sin(a * 0.5)) * 0.85;
        }

        // 2. Kummer Quartic K3 Surface (Team)
        vec3 evalKummer(float u, float v, float k1, float a) {
            float phase = k1 * 1.5707963;
            float su = sin(u + phase), cu = cos(u + phase);
            float sv = sin(v), cv = cos(v);
            
            float w1 = su * cv;
            float w2 = su * sv;
            float w3 = cu;
            
            float k2 = 1.85 + 0.35 * sin(a * 0.7);
            float denom = 1.0 + 0.32 * (w1 * w1 + w2 * w2 + w3 * w3);
            
            float X = w1 * (1.0 - w1 * w1 + k2 * (w2 * w2 - w3 * w3)) / denom;
            float Y = w2 * (1.0 - w2 * w2 + k2 * (w3 * w3 - w1 * w1)) / denom;
            float Z = w3 * (1.0 - w3 * w3 + k2 * (w1 * w1 - w2 * w2)) / denom;
            
            return vec3(X, Y, Z) * 0.75;
        }

        // 3. 6D Clifford-Hopf Calabi-Yau Projection (Gallery)
        vec3 evalCliffordHopf(float u, float v, float k1, float a) {
            float sheetAngle = k1 * (6.2831853 / 6.0);
            float u_eff = u + sheetAngle + a * 0.22;
            
            float d1 = 1.0 + 0.5 * sin(v) * sin(6.0 * u_eff);
            float d2 = 1.0 + 0.5 * cos(v) * cos(6.0 * u_eff);
            
            float X = (cos(u_eff) * cos(v)) / d1;
            float Y = (sin(u_eff) * cos(v)) / d1;
            float Z = (sin(v) * cos(3.0 * u_eff + a)) / d2;
            
            return vec3(X, Y, Z) * 0.95;
        }

        // 4. Complete Intersection Calabi-Yau CICY (Club)
        vec3 evalCICY(float x, float y, float k1, float k2, float a) {
            float phi1 = 2.0 * x + k1 * 1.5707963;
            float phi2 = 2.0 * y + k2 * 1.5707963;
            
            float cx = cos(x), sx = sin(x);
            float cy = cos(y), sy = sin(y);
            
            float X = cx * cos(phi1) + 0.3 * cy * cos(phi2 + a);
            float Y = sx * sin(phi2) + 0.3 * sy * sin(phi1 + a);
            float Z = cx * sy * cos(phi1 + phi2) * cos(a) + sx * cy * sin(phi2 - phi1) * sin(a);
            
            return vec3(X, Y, Z) * 0.9;
        }

        vec3 getPos(float u, float v, float k1, float k2) {
            if (u_type == 0) return evalFermat(u, v, k1, k2, u_n, u_alpha);
            else if (u_type == 1) return evalToricConifold(u, v, k1, k2, u_alpha);
            else if (u_type == 2) return evalKummer(u, v, k1, u_alpha);
            else if (u_type == 3) return evalCliffordHopf(u, v, k1, u_alpha);
            else return evalCICY(u, v, k1, k2, u_alpha);
        }

        void main() {
            float u = a_coord.x;
            float v = a_coord.y;
            float k1 = a_sheet.x;
            float k2 = a_sheet.y;

            vec3 pos = getPos(u, v, k1, k2);

            float eps = 0.015;
            vec3 px = getPos(u + eps, v, k1, k2);
            vec3 py = getPos(u, v + eps, k1, k2);
            vec3 dX = (px - pos) / eps;
            vec3 dY = (py - pos) / eps;

            vec3 localNorm = cross(dX, dY);
            float normLen = length(localNorm);
            vec3 N = (normLen > 1e-4) ? (localNorm / normLen) : vec3(0.0, 1.0, 0.0);

            vec4 worldPos = u_model * vec4(pos * u_scale, 1.0);
            v_worldPos = worldPos.xyz;
            v_normal = normalize(mat3(u_model[0].xyz, u_model[1].xyz, u_model[2].xyz) * N);
            v_uv = a_coord;
            v_sheet = a_sheet;

            gl_Position = u_mvp * vec4(pos * u_scale, 1.0);
        }
    `;

    // Fragment Shader: Vibrant, luminous, iridescent celestial depth
    const fsSource = `
        precision highp float;

        varying vec3 v_normal;
        varying vec3 v_worldPos;
        varying vec2 v_uv;
        varying vec2 v_sheet;

        uniform vec3 u_baseColor;
        uniform vec3 u_glowColor;
        uniform vec3 u_gridColor;
        uniform vec3 u_camPos;
        uniform vec3 u_lightDir;
        uniform float u_n;

        void main() {
            vec3 N = normalize(v_normal);
            if (!gl_FrontFacing) {
                N = -N;
            }

            vec3 V = normalize(u_camPos - v_worldPos);
            vec3 L = normalize(u_lightDir);
            vec3 H = normalize(L + V);

            // Vibrant diffuse lighting
            float NdotL = max(dot(N, L), 0.0);
            float diff = 0.40 + 0.60 * NdotL;

            // Lustrous specular highlight
            float NdotH = max(dot(N, H), 0.0);
            float spec = pow(NdotH, 22.0) * 0.42;

            // Radiant Fresnel edge glow
            float NdotV = max(dot(N, V), 0.0);
            float fresnel = pow(1.0 - NdotV, 2.2) * 0.75;

            // Delicate coordinate isolines
            vec2 gridUV = fract(v_uv * 8.0);
            vec2 gridLines = smoothstep(0.44, 0.49, abs(gridUV - 0.5));
            float isGrid = max(gridLines.x, gridLines.y);

            // Harmonic chromatic tint variance across topological sheets
            float sheetPhase = (v_sheet.x + v_sheet.y) / (2.0 * max(u_n, 1.0));
            vec3 sheetTint = 0.10 * sin(vec3(sheetPhase * 6.28, sheetPhase * 6.28 + 2.09, sheetPhase * 6.28 + 4.18));
            vec3 surfaceColor = u_baseColor + sheetTint;

            vec3 shaded = surfaceColor * diff + (u_glowColor + vec3(0.4)) * spec;
            vec3 finalColor = mix(shaded, u_gridColor, isGrid * 0.35);
            finalColor += u_glowColor * fresnel * 0.82;

            // Soft cosmic void blending
            float dist = length(u_camPos - v_worldPos);
            float fog = smoothstep(2.0, 7.0, dist);
            vec3 bgVoid = vec3(0.024, 0.032, 0.052);
            finalColor = mix(finalColor, bgVoid, fog * 0.40);

            // Vibrant, luminous alpha - distinct yet harmonized with content
            float alpha = 0.48 + 0.22 * fresnel + 0.12 * isGrid;
            gl_FragColor = vec4(finalColor, min(alpha, 0.72));
        }
    `;

    // Star Field Shader (Soft twinkling deep space dust)
    const starVsSource = `
        attribute vec3 a_position;
        attribute float a_brightness;
        uniform mat4 u_mvp;
        uniform float u_time;
        varying float v_alpha;

        void main() {
            vec3 p = a_position;
            p.y += sin(u_time * 0.25 + p.x * 2.0) * 0.12;
            p.x += cos(u_time * 0.2 + p.z * 2.0) * 0.12;
            gl_Position = u_mvp * vec4(p, 1.0);
            gl_PointSize = clamp((2.0 / gl_Position.w) * 2.5, 1.0, 3.5);
            v_alpha = 0.25 + 0.45 * sin(u_time * 1.2 + a_brightness * 10.0);
        }
    `;

    const starFsSource = `
        precision mediump float;
        uniform vec3 u_starColor;
        varying float v_alpha;

        void main() {
            vec2 c = gl_PointCoord - vec2(0.5);
            float dist = length(c);
            if (dist > 0.5) discard;
            float glow = exp(-4.0 * dist * dist);
            gl_FragColor = vec4(u_starColor, glow * v_alpha * 0.4);
        }
    `;

    function createShader(gl, type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Shader compile error:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    function createProgram(gl, vs, fs) {
        const p = gl.createProgram();
        gl.attachShader(p, vs);
        gl.attachShader(p, fs);
        gl.linkProgram(p);
        if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
            console.error('Program link error:', gl.getProgramInfoLog(p));
            gl.deleteProgram(p);
            return null;
        }
        return p;
    }

    const manifoldVS = createShader(gl, gl.VERTEX_SHADER, vsSource);
    const manifoldFS = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
    if (!manifoldVS || !manifoldFS) return;
    const manifoldProgram = createProgram(gl, manifoldVS, manifoldFS);
    if (!manifoldProgram) return;

    const starVS = createShader(gl, gl.VERTEX_SHADER, starVsSource);
    const starFS = createShader(gl, gl.FRAGMENT_SHADER, starFsSource);
    const starProgram = (starVS && starFS) ? createProgram(gl, starVS, starFS) : null;

    // --- High-Resolution Mesh Generation per Parametrization ---
    const density = config.density;
    const numSheets = config.numSheets;
    const vertsPerSheet = density * density;
    const totalVertices = numSheets * vertsPerSheet;

    const coordsArray = new Float32Array(totalVertices * 2);
    const sheetsArray = new Float32Array(totalVertices * 2);

    let vOffset = 0;
    for (let s = 0; s < numSheets; s++) {
        let k1 = s, k2 = 0;
        if (config.type === 0) {
            // Fermat: n x n roots
            k1 = Math.floor(s / config.n);
            k2 = s % config.n;
        } else if (config.type === 4) {
            k1 = Math.floor(s / config.n);
            k2 = s % config.n;
        }

        for (let iy = 0; iy < density; iy++) {
            const ty = iy / (density - 1);
            const vVal = config.vMin + ty * (config.vMax - config.vMin);
            for (let ix = 0; ix < density; ix++) {
                const tx = ix / (density - 1);
                const uVal = config.uMin + tx * (config.uMax - config.uMin);

                const idx = vOffset * 2;
                coordsArray[idx] = uVal;
                coordsArray[idx + 1] = vVal;
                sheetsArray[idx] = k1;
                sheetsArray[idx + 1] = k2;
                vOffset++;
            }
        }
    }

    const quadsPerSheet = (density - 1) * (density - 1);
    const indicesPerSheet = quadsPerSheet * 6;
    const totalIndices = numSheets * indicesPerSheet;
    const indicesArray = new Uint16Array(totalIndices);

    let iOffset = 0;
    for (let s = 0; s < numSheets; s++) {
        const baseVert = s * vertsPerSheet;
        for (let iy = 0; iy < density - 1; iy++) {
            for (let ix = 0; ix < density - 1; ix++) {
                const i0 = baseVert + iy * density + ix;
                const i1 = i0 + 1;
                const i2 = baseVert + (iy + 1) * density + ix;
                const i3 = i2 + 1;

                indicesArray[iOffset++] = i0;
                indicesArray[iOffset++] = i2;
                indicesArray[iOffset++] = i1;

                indicesArray[iOffset++] = i1;
                indicesArray[iOffset++] = i2;
                indicesArray[iOffset++] = i3;
            }
        }
    }

    // Buffers
    const coordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, coordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, coordsArray, gl.STATIC_DRAW);

    const sheetBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sheetBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, sheetsArray, gl.STATIC_DRAW);

    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indicesArray, gl.STATIC_DRAW);

    // Uniforms
    const uMvpLoc = gl.getUniformLocation(manifoldProgram, 'u_mvp');
    const uModelLoc = gl.getUniformLocation(manifoldProgram, 'u_model');
    const uNLoc = gl.getUniformLocation(manifoldProgram, 'u_n');
    const uAlphaLoc = gl.getUniformLocation(manifoldProgram, 'u_alpha');
    const uScaleLoc = gl.getUniformLocation(manifoldProgram, 'u_scale');
    const uTypeLoc = gl.getUniformLocation(manifoldProgram, 'u_type');
    const uBaseColorLoc = gl.getUniformLocation(manifoldProgram, 'u_baseColor');
    const uGlowColorLoc = gl.getUniformLocation(manifoldProgram, 'u_glowColor');
    const uGridColorLoc = gl.getUniformLocation(manifoldProgram, 'u_gridColor');
    const uCamPosLoc = gl.getUniformLocation(manifoldProgram, 'u_camPos');
    const uLightDirLoc = gl.getUniformLocation(manifoldProgram, 'u_lightDir');

    const aCoordLoc = gl.getAttribLocation(manifoldProgram, 'a_coord');
    const aSheetLoc = gl.getAttribLocation(manifoldProgram, 'a_sheet');

    // Subtle Starfield
    let starBuffer = null;
    let starCount = 80;
    if (starProgram) {
        const starData = new Float32Array(starCount * 4);
        for (let i = 0; i < starCount; i++) {
            const idx = i * 4;
            starData[idx] = (Math.random() - 0.5) * 14.0;
            starData[idx + 1] = (Math.random() - 0.5) * 14.0;
            starData[idx + 2] = (Math.random() - 0.5) * 10.0;
            starData[idx + 3] = Math.random();
        }
        starBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, starBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, starData, gl.STATIC_DRAW);
    }

    // Non-interactive: purely autonomous gentle ambient rotation
    let currentRotX = 0.26;
    let currentRotY = 0.35;

    // Resize Handler
    function resizeCanvas() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = window.innerWidth;
        const h = window.innerHeight;
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
        gl.viewport(0, 0, canvas.width, canvas.height);
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Matrix Storage
    const projMat = new Float32Array(16);
    const viewMat = new Float32Array(16);
    const modelMat = new Float32Array(16);
    const vpMat = new Float32Array(16);
    const mvpMat = new Float32Array(16);

    const startTime = performance.now();

    // Render Loop
    function render(now) {
        const time = (now - startTime) * 0.001;

        // Smooth autonomous celestial drift
        currentRotY += config.rotSpeed * 0.016;
        currentRotX = 0.28 + Math.sin(time * 0.12) * 0.08;

        const alpha = time * config.alphaSpeed;

        // Dark deep cosmic void background (#06080d)
        gl.clearColor(0.024, 0.032, 0.052, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.disable(gl.CULL_FACE);

        const aspect = canvas.width / canvas.height;
        Mat4.perspective(projMat, Math.PI / 4, aspect, 0.1, 50.0);

        const camPos = [0.0, 0.0, config.camDist];
        Mat4.lookAt(viewMat, camPos, [0.0, 0.0, 0.0], [0.0, 1.0, 0.0]);
        Mat4.multiply(vpMat, projMat, viewMat);

        // Render Subtle Star Dust
        if (starProgram && starBuffer) {
            gl.useProgram(starProgram);
            const uStarMvpLoc = gl.getUniformLocation(starProgram, 'u_mvp');
            const uStarTimeLoc = gl.getUniformLocation(starProgram, 'u_time');
            const uStarColorLoc = gl.getUniformLocation(starProgram, 'u_starColor');
            const aPosLoc = gl.getAttribLocation(starProgram, 'a_position');
            const aBrightLoc = gl.getAttribLocation(starProgram, 'a_brightness');

            gl.uniformMatrix4fv(uStarMvpLoc, false, vpMat);
            gl.uniform1f(uStarTimeLoc, time);
            gl.uniform3fv(uStarColorLoc, config.glowColor);

            gl.bindBuffer(gl.ARRAY_BUFFER, starBuffer);
            gl.enableVertexAttribArray(aPosLoc);
            gl.vertexAttribPointer(aPosLoc, 3, gl.FLOAT, false, 16, 0);
            gl.enableVertexAttribArray(aBrightLoc);
            gl.vertexAttribPointer(aBrightLoc, 1, gl.FLOAT, false, 16, 12);

            gl.drawArrays(gl.POINTS, 0, starCount);
            gl.disableVertexAttribArray(aPosLoc);
            gl.disableVertexAttribArray(aBrightLoc);
        }

        // Model Matrix
        Mat4.identity(modelMat);
        Mat4.rotateX(modelMat, modelMat, currentRotX);
        Mat4.rotateY(modelMat, modelMat, currentRotY);
        Mat4.rotateZ(modelMat, modelMat, Math.sin(time * 0.08) * 0.12);

        Mat4.multiply(mvpMat, vpMat, modelMat);

        // Render Calabi-Yau Manifold
        gl.useProgram(manifoldProgram);

        gl.uniformMatrix4fv(uMvpLoc, false, mvpMat);
        gl.uniformMatrix4fv(uModelLoc, false, modelMat);
        gl.uniform1f(uNLoc, config.n);
        gl.uniform1f(uAlphaLoc, alpha);
        gl.uniform1f(uScaleLoc, config.scale);
        gl.uniform1i(uTypeLoc, config.type);
        gl.uniform3fv(uBaseColorLoc, config.baseColor);
        gl.uniform3fv(uGlowColorLoc, config.glowColor);
        gl.uniform3fv(uGridColorLoc, config.gridColor);
        gl.uniform3fv(uCamPosLoc, camPos);
        gl.uniform3f(uLightDirLoc, 1.0, 1.2, 1.5);

        gl.bindBuffer(gl.ARRAY_BUFFER, coordBuffer);
        gl.enableVertexAttribArray(aCoordLoc);
        gl.vertexAttribPointer(aCoordLoc, 2, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, sheetBuffer);
        gl.enableVertexAttribArray(aSheetLoc);
        gl.vertexAttribPointer(aSheetLoc, 2, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.drawElements(gl.TRIANGLES, totalIndices, gl.UNSIGNED_SHORT, 0);

        gl.disableVertexAttribArray(aCoordLoc);
        gl.disableVertexAttribArray(aSheetLoc);

        requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
}


/* --- Dynamic Feynman Diagram Quantum Vacuum Fluctuation Layer --- */
function initFeynmanDiagrams() {
    let canvas = document.getElementById('feynmanCanvas');
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = 'feynmanCanvas';
        const starsCanvas = document.getElementById('starsCanvas');
        if (starsCanvas && starsCanvas.parentNode) {
            starsCanvas.parentNode.insertBefore(canvas, starsCanvas.nextSibling);
        } else {
            document.body.insertBefore(canvas, document.body.firstChild);
        }
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Detect page theme to harmonize palette
    const pageName = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
    let theme = {
        primary: '#ffd24d',    // Vibrant Solar Gold
        secondary: '#ffe082',
        photon: '#7ce8ff',     // Electric Photon Cyan
        gluon: '#ffab40',      // Energetic Gluon Orange
        vertex: '#ffffff',
        text: '#fff6d6',
        glow: 'rgba(255, 210, 77, 0.45)'
    };

    if (pageName.includes('past_events')) {
        theme = {
            primary: '#4fc3f7',    // Quantum Sapphire Blue
            secondary: '#81d4fa',
            photon: '#e1f5fe',     // Pure White/Cyan Photon
            gluon: '#29b6f6',
            vertex: '#ffffff',
            text: '#e1f5fe',
            glow: 'rgba(79, 195, 247, 0.45)'
        };
    } else if (pageName.includes('team')) {
        theme = {
            primary: '#ff80ab',    // Vibrant Ruby Rose
            secondary: '#ff4081',
            photon: '#ffd54f',     // Radiant Gold Photon
            gluon: '#f50057',
            vertex: '#ffffff',
            text: '#fce4ec',
            glow: 'rgba(255, 64, 129, 0.45)'
        };
    } else if (pageName.includes('gallery')) {
        theme = {
            primary: '#69f0ae',    // Vibrant Emerald Jade
            secondary: '#00e676',
            photon: '#80d8ff',     // Bright Cyan Photon
            gluon: '#00b0ff',
            vertex: '#ffffff',
            text: '#e8f5e9',
            glow: 'rgba(105, 240, 174, 0.45)'
        };
    } else if (pageName.includes('club')) {
        theme = {
            primary: '#b388ff',    // Vibrant Royal Amethyst
            secondary: '#7c4dff',
            photon: '#ff80ab',     // Electric Rose Photon
            gluon: '#d500f9',
            vertex: '#ffffff',
            text: '#ede7f6',
            glow: 'rgba(179, 136, 255, 0.45)'
        };
    }

    let dpr = 1;
    let width = 0;
    let height = 0;

    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
    }
    resize();
    window.addEventListener('resize', resize);

    // --- Vector Drawing Primitives with Chronological Progress Support ---
    function clamp(val, min = 0, max = 1) {
        return Math.min(Math.max(val, min), max);
    }

    function drawFermionLine(ctx, x1, y1, x2, y2, progress = 1, hasArrow = true, reverseArrow = false) {
        if (progress <= 0) return;
        const p = clamp(progress, 0, 1);
        const curX = x1 + (x2 - x1) * p;
        const curY = y1 + (y2 - y1) * p;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(curX, curY);
        ctx.stroke();

        if (hasArrow && p >= 0.45) {
            const mx = (x1 + x2) * 0.5;
            const my = (y1 + y2) * 0.5;
            let angle = Math.atan2(y2 - y1, x2 - x1);
            if (reverseArrow) angle += Math.PI;
            const arrowAlpha = clamp((p - 0.45) / 0.25, 0, 1);
            ctx.save();
            ctx.globalAlpha *= arrowAlpha;
            drawArrow(ctx, mx, my, angle, 6);
            ctx.restore();
        }
    }

    function drawArrow(ctx, x, y, angle, size = 6) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(size, 0);
        ctx.lineTo(-size * 0.75, -size * 0.55);
        ctx.lineTo(-size * 0.35, 0);
        ctx.lineTo(-size * 0.75, size * 0.55);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    function drawWavyLine(ctx, x1, y1, x2, y2, progress = 1, amplitude = 4.5, waves = 4) {
        if (progress <= 0) return;
        const p = clamp(progress, 0, 1);
        const dx = x2 - x1, dy = y2 - y1;
        const dist = Math.hypot(dx, dy);
        if (dist < 1) return;
        const nx = -dy / dist, ny = dx / dist;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        const totalSteps = Math.max(Math.floor(dist * 0.8), 24);
        const curSteps = Math.max(Math.floor(totalSteps * p), 1);
        for (let i = 1; i <= curSteps; i++) {
            const t = (i / totalSteps);
            const px = x1 + dx * t;
            const py = y1 + dy * t;
            const wave = Math.sin(t * Math.PI * 2 * waves) * amplitude;
            ctx.lineTo(px + nx * wave, py + ny * wave);
        }
        ctx.stroke();
    }

    function drawWavyArc(ctx, cx, cy, radius, startAngle, endAngle, progress = 1, amplitude = 4, waves = 5) {
        if (progress <= 0) return;
        const p = clamp(progress, 0, 1);
        ctx.beginPath();
        const span = endAngle - startAngle;
        const totalSteps = 40;
        const curSteps = Math.max(Math.floor(totalSteps * p), 1);
        for (let i = 0; i <= curSteps; i++) {
            const t = (i / totalSteps);
            const angle = startAngle + span * t;
            const wave = Math.sin(t * Math.PI * 2 * waves) * amplitude;
            const r = radius + wave;
            const x = cx + r * Math.cos(angle);
            const y = cy + r * Math.sin(angle);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
    }

    function drawFermionSemicircle(ctx, cx, cy, radius, isUpper, progress = 1, hasArrow = true, arrowRight = true) {
        if (progress <= 0) return;
        const p = clamp(progress, 0, 1);
        const steps = 36;
        const curSteps = Math.max(Math.floor(steps * p), 1);

        ctx.beginPath();
        for (let i = 0; i <= curSteps; i++) {
            const t = i / steps;
            // isUpper arches above the line (y < 0 in canvas): angle goes PI -> 2*PI
            // !isUpper arches below the line (y > 0 in canvas): angle goes PI -> 0
            const angle = isUpper ? (Math.PI + Math.PI * t) : (Math.PI - Math.PI * t);
            const x = cx + radius * Math.cos(angle);
            const y = cy + radius * Math.sin(angle);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        if (hasArrow && p >= 0.45) {
            const arrowAlpha = clamp((p - 0.45) / 0.25, 0, 1);
            ctx.save();
            ctx.globalAlpha *= arrowAlpha;
            const ax = cx;
            const ay = isUpper ? (cy - radius) : (cy + radius);
            const arrowAngle = arrowRight ? 0 : Math.PI;
            drawArrow(ctx, ax, ay, arrowAngle, 6);
            ctx.restore();
        }
    }

    function drawGluonLine(ctx, x1, y1, x2, y2, progress = 1, loops = 5, loopRadius = 4.5) {
        if (progress <= 0) return;
        const p = clamp(progress, 0, 1);
        const dx = x2 - x1, dy = y2 - y1;
        const dist = Math.hypot(dx, dy);
        if (dist < 1) return;
        const ux = dx / dist, uy = dy / dist;
        const nx = -uy, ny = ux;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        const totalSteps = loops * 16;
        const curSteps = Math.max(Math.floor(totalSteps * p), 1);
        for (let i = 0; i <= curSteps; i++) {
            const t = (i / totalSteps);
            const basePos = t * dist;
            const theta = t * Math.PI * 2 * loops;
            const forward = Math.sin(theta) * (loopRadius * 0.35);
            const sideways = Math.cos(theta) * loopRadius;
            const px = x1 + ux * (basePos + forward) + nx * sideways;
            const py = y1 + uy * (basePos + forward) + ny * sideways;
            ctx.lineTo(px, py);
        }
        ctx.stroke();
    }

    function drawDashedLine(ctx, x1, y1, x2, y2, progress = 1) {
        if (progress <= 0) return;
        const p = clamp(progress, 0, 1);
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x1 + (x2 - x1) * p, y1 + (y2 - y1) * p);
        ctx.stroke();
        ctx.restore();
    }

    function drawVertex(ctx, x, y, progress = 1, baseRadius = 2.8) {
        if (progress <= 0) return;
        const p = clamp(progress, 0, 1);
        const burst = Math.sin(p * Math.PI) * 1.6;
        const r = baseRadius * p + burst;
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, Math.max(r, 0.6), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    function drawLabel(ctx, text, x, y, progress = 1) {
        if (progress <= 0) return;
        const p = clamp(progress, 0, 1);
        ctx.save();
        ctx.globalAlpha *= p;
        ctx.fillText(text, x, y);
        ctx.restore();
    }

    // --- 8 Authentic Feynman Diagrams with Sequence Progression ---
    function renderDiagram(ctx, type, theme, stages) {
        ctx.lineWidth = 1.9;
        ctx.font = 'bold 11px "Courier New", monospace, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const { pIn, pInLabel, pVertex1, pInternal, pVertex2, pInternalLabel, pOut, pOutLabel } = stages;

        switch (type) {
            case 0: {
                // 0. Electron-Positron Annihilation (e+ e- -> gamma* -> mu+ mu-)
                // 1) In-correlators: e- and e+ arriving at interaction vertex 1 (forward arrows, anti-particle labeled e+)
                ctx.strokeStyle = theme.primary;
                ctx.fillStyle = theme.primary;
                drawFermionLine(ctx, -65, -35, -22, 0, pIn, true, false); // e-
                drawFermionLine(ctx, -65, 35, -22, 0, pIn, true, false);  // e+ (forward arrow, anti-particle)

                ctx.fillStyle = theme.text;
                drawLabel(ctx, 'e⁻', -74, -38, pInLabel);
                drawLabel(ctx, 'e⁺', -74, 38, pInLabel);

                // 2) Interaction vertex 1 & internal virtual photon propagator
                ctx.fillStyle = theme.vertex;
                drawVertex(ctx, -22, 0, pVertex1);

                ctx.strokeStyle = theme.photon;
                drawWavyLine(ctx, -22, 0, 22, 0, pInternal, 4.5, 3.5); // gamma*
                ctx.fillStyle = theme.text;
                drawLabel(ctx, 'γ*', 0, -12, pInternalLabel);

                // Interaction vertex 2
                ctx.fillStyle = theme.vertex;
                drawVertex(ctx, 22, 0, pVertex2);

                // 3) Out-correlators: mu- and mu+ emerging (forward arrows, anti-particle labeled mu+)
                ctx.strokeStyle = theme.primary;
                ctx.fillStyle = theme.primary;
                drawFermionLine(ctx, 22, 0, 65, -35, pOut, true, false); // mu-
                drawFermionLine(ctx, 22, 0, 65, 35, pOut, true, false);  // mu+ (forward arrow, anti-particle)

                ctx.fillStyle = theme.text;
                drawLabel(ctx, 'μ⁻', 74, -38, pOutLabel);
                drawLabel(ctx, 'μ⁺', 74, 38, pOutLabel);
                break;
            }
            case 1: {
                // 1. Compton Scattering (e- gamma -> e- gamma)
                // 1) In-correlators: incoming electron & photon
                ctx.strokeStyle = theme.primary;
                ctx.fillStyle = theme.primary;
                drawFermionLine(ctx, -60, -35, -16, 0, pIn, true, false); // in e-
                ctx.strokeStyle = theme.photon;
                drawWavyLine(ctx, -60, 35, -16, 0, pIn, 4, 3.5);          // in gamma

                ctx.fillStyle = theme.text;
                drawLabel(ctx, 'e⁻', -68, -38, pInLabel);
                drawLabel(ctx, 'γ', -68, 38, pInLabel);

                // 2) Interaction vertex 1, internal virtual electron, vertex 2
                ctx.fillStyle = theme.vertex;
                drawVertex(ctx, -16, 0, pVertex1);

                ctx.strokeStyle = theme.primary;
                ctx.fillStyle = theme.primary;
                drawFermionLine(ctx, -16, 0, 16, 0, pInternal, true, false); // virtual e-
                ctx.fillStyle = theme.text;
                drawLabel(ctx, 'e*', 0, -11, pInternalLabel);

                ctx.fillStyle = theme.vertex;
                drawVertex(ctx, 16, 0, pVertex2);

                // 3) Out-correlators: scattered electron & photon
                ctx.strokeStyle = theme.primary;
                ctx.fillStyle = theme.primary;
                drawFermionLine(ctx, 16, 0, 60, -35, pOut, true, false);  // out e-
                ctx.strokeStyle = theme.photon;
                drawWavyLine(ctx, 16, 0, 60, 35, pOut, 4, 3.5);           // out gamma

                ctx.fillStyle = theme.text;
                drawLabel(ctx, 'e⁻', 68, -38, pOutLabel);
                drawLabel(ctx, 'γ', 68, 38, pOutLabel);
                break;
            }
            case 2: {
                // 2. Electron Self-Energy Loop (Virtual Photon Correction)
                // 1) In-correlator: incoming electron line
                ctx.strokeStyle = theme.primary;
                ctx.fillStyle = theme.primary;
                drawFermionLine(ctx, -70, 0, -28, 0, pIn, true, false);
                ctx.fillStyle = theme.text;
                drawLabel(ctx, 'p', -50, 12, pInLabel);

                // 2) Interaction vertex 1, internal propagator + virtual photon bubble, vertex 2
                ctx.fillStyle = theme.vertex;
                drawVertex(ctx, -28, 0, pVertex1);

                ctx.strokeStyle = theme.primary;
                ctx.fillStyle = theme.primary;
                drawFermionLine(ctx, -28, 0, 28, 0, pInternal, true, false);
                ctx.strokeStyle = theme.photon;
                drawWavyArc(ctx, 0, 0, 28, Math.PI, Math.PI * 2, pInternal, 3.5, 4.5);

                ctx.fillStyle = theme.text;
                drawLabel(ctx, 'p-k', 0, 12, pInternalLabel);
                drawLabel(ctx, 'k (γ)', 0, -38, pInternalLabel);

                ctx.fillStyle = theme.vertex;
                drawVertex(ctx, 28, 0, pVertex2);

                // 3) Out-correlator: renormalized outgoing electron line
                ctx.strokeStyle = theme.primary;
                ctx.fillStyle = theme.primary;
                drawFermionLine(ctx, 28, 0, 70, 0, pOut, true, false);
                ctx.fillStyle = theme.text;
                drawLabel(ctx, 'p', 50, 12, pOutLabel);
                break;
            }
            case 3: {
                // 3. Vacuum Polarization Loop (Photon -> Fermion Bubble -> Photon)
                // 1) In-correlator: incoming photon from left
                ctx.strokeStyle = theme.photon;
                drawWavyLine(ctx, -68, 0, -26, 0, pIn, 4, 3);
                ctx.fillStyle = theme.text;
                drawLabel(ctx, 'γ', -50, -12, pInLabel);

                // 2) Interaction vertex 1, circular fermion loop bubble (upper e-, lower e+ anti-particle), vertex 2
                ctx.fillStyle = theme.vertex;
                drawVertex(ctx, -26, 0, pVertex1);

                ctx.strokeStyle = theme.primary;
                ctx.fillStyle = theme.primary;
                // Both arcs originate at the incoming vertex (-26, 0) and sweep forward to (26, 0)
                // Upper e- arc: arches above the axis, forward arrow pointing right
                drawFermionSemicircle(ctx, 0, 0, 26, true, pInternal, true, true);
                // Lower e+ arc: arches below the axis, forward arrow pointing right, anti-particle labeled e+
                drawFermionSemicircle(ctx, 0, 0, 26, false, pInternal, true, true);

                ctx.fillStyle = theme.text;
                drawLabel(ctx, 'e⁻', 0, -36, pInternalLabel);
                drawLabel(ctx, 'e⁺', 0, 36, pInternalLabel);

                ctx.fillStyle = theme.vertex;
                drawVertex(ctx, 26, 0, pVertex2);

                // 3) Out-correlator: outgoing photon to right
                ctx.strokeStyle = theme.photon;
                drawWavyLine(ctx, 26, 0, 68, 0, pOut, 4, 3);
                ctx.fillStyle = theme.text;
                drawLabel(ctx, 'γ', 50, -12, pOutLabel);
                break;
            }
            case 4: {
                // 4. Triple Gluon Non-Abelian QCD Vertex (g -> gg)
                // 1) In-correlator: incoming gluon coil
                ctx.strokeStyle = theme.gluon;
                drawGluonLine(ctx, -55, 0, 0, 0, pIn, 4, 4.5);
                ctx.fillStyle = theme.text;
                drawLabel(ctx, 'g₁', -64, 0, pInLabel);

                // 2) Non-Abelian gauge interaction vertex
                ctx.fillStyle = theme.vertex;
                drawVertex(ctx, 0, 0, pVertex1, 3.4);

                // 3) Out-correlators: outgoing gluons
                drawGluonLine(ctx, 0, 0, 38, -42, pOut, 4, 4.5);
                drawGluonLine(ctx, 0, 0, 38, 42, pOut, 4, 4.5);

                ctx.fillStyle = theme.text;
                drawLabel(ctx, 'g₂', 48, -48, pOutLabel);
                drawLabel(ctx, 'g₃', 48, 48, pOutLabel);
                break;
            }
            case 5: {
                // 5. Higgs Boson to Diphoton (H -> gamma gamma via Top-Quark Triangle Loop)
                // 1) In-correlator: dashed Higgs line arriving at vertex 1
                ctx.strokeStyle = theme.secondary;
                drawDashedLine(ctx, -65, 0, -20, 0, pIn);
                ctx.fillStyle = theme.text;
                drawLabel(ctx, 'H⁰', -50, -12, pInLabel);

                // 2) Interaction vertex 1 & virtual top-quark triangle loop
                ctx.fillStyle = theme.vertex;
                drawVertex(ctx, -20, 0, pVertex1);

                ctx.strokeStyle = theme.primary;
                ctx.fillStyle = theme.primary;
                // Both branches originate at the incoming interaction vertex (-20, 0)
                const pBranch = clamp(pInternal / 0.72, 0, 1);
                drawFermionLine(ctx, -20, 0, 18, -26, pBranch, true, false); // top quark t (forward arrow)
                drawFermionLine(ctx, -20, 0, 18, 26, pBranch, true, false);  // anti-top t-bar (forward arrow, anti-particle)

                // Vertical propagator closes the triangle as branches reach the right vertices
                const pVert = clamp((pInternal - 0.40) / 0.60, 0, 1);
                drawFermionLine(ctx, 18, -26, 18, 26, pVert, false);

                ctx.fillStyle = theme.vertex;
                drawVertex(ctx, 18, -26, pVertex2);
                drawVertex(ctx, 18, 26, pVertex2);

                ctx.fillStyle = theme.text;
                drawLabel(ctx, 't', -3, -22, pInternalLabel);
                drawLabel(ctx, 't̄', -3, 22, pInternalLabel);

                // 3) Out-correlators: two outgoing wavy photons
                ctx.strokeStyle = theme.photon;
                drawWavyLine(ctx, 18, -26, 65, -45, pOut, 3.5, 3.5);
                drawWavyLine(ctx, 18, 26, 65, 45, pOut, 3.5, 3.5);

                ctx.fillStyle = theme.text;
                drawLabel(ctx, 'γ', 72, -48, pOutLabel);
                drawLabel(ctx, 'γ', 72, 48, pOutLabel);
                break;
            }
            case 6: {
                // 6. Beta Decay / Weak Force (d -> u + W- -> u + e- + nu_e)
                // 1) In-correlator: incoming d-quark
                ctx.strokeStyle = theme.primary;
                ctx.fillStyle = theme.primary;
                drawFermionLine(ctx, -65, -25, -12, -15, pIn, true, false); // d quark
                ctx.fillStyle = theme.text;
                drawLabel(ctx, 'd', -72, -28, pInLabel);

                // 2) Interaction vertex 1, virtual W- boson line, vertex 2
                ctx.fillStyle = theme.vertex;
                drawVertex(ctx, -12, -15, pVertex1);

                ctx.strokeStyle = theme.photon;
                drawWavyLine(ctx, -12, -15, 15, 20, pInternal, 3.8, 3.5); // W- boson
                ctx.fillStyle = theme.text;
                drawLabel(ctx, 'W⁻', -6, 8, pInternalLabel);

                ctx.fillStyle = theme.vertex;
                drawVertex(ctx, 15, 20, pVertex2);

                // 3) Out-correlators: transformed u-quark, electron, anti-neutrino (all forward arrows)
                ctx.strokeStyle = theme.primary;
                ctx.fillStyle = theme.primary;
                drawFermionLine(ctx, -12, -15, 65, -15, pOut, true, false);  // u quark
                drawFermionLine(ctx, 15, 20, 65, 12, pOut, true, false);     // e-
                drawFermionLine(ctx, 15, 20, 65, 40, pOut, true, false);     // anti-nu_e (forward arrow, anti-particle)

                ctx.fillStyle = theme.text;
                drawLabel(ctx, 'u', 72, -18, pOutLabel);
                drawLabel(ctx, 'e⁻', 74, 10, pOutLabel);
                drawLabel(ctx, 'ν̄ₑ', 74, 42, pOutLabel);
                break;
            }
            case 7: {
                // 7. Light-by-Light Scattering (gamma gamma -> gamma gamma via Square Fermion Box Loop)
                // 1) In-correlators: incoming photons
                ctx.strokeStyle = theme.photon;
                drawWavyLine(ctx, -65, -45, -22, -22, pIn, 3.5, 3.5);
                drawWavyLine(ctx, -65, 45, -22, 22, pIn, 3.5, 3.5);
                ctx.fillStyle = theme.text;
                drawLabel(ctx, 'γ₁', -72, -48, pInLabel);
                drawLabel(ctx, 'γ₂', -72, 48, pInLabel);

                // 2) In-vertices, virtual fermion box loop, out-vertices
                ctx.fillStyle = theme.vertex;
                drawVertex(ctx, -22, -22, pVertex1);
                drawVertex(ctx, -22, 22, pVertex1);

                ctx.strokeStyle = theme.primary;
                ctx.fillStyle = theme.primary;
                // Left vertical connector forms at incoming vertices
                const pLeft = clamp(pInternal / 0.65, 0, 1);
                drawFermionLine(ctx, -22, 22, -22, -22, pLeft, true, false);

                // Top line (quark) and bottom line (anti-quark) propagate forward from incoming vertices
                const pHoriz = clamp(pInternal / 0.75, 0, 1);
                drawFermionLine(ctx, -22, -22, 22, -22, pHoriz, true, false); // q line (forward arrow)
                drawFermionLine(ctx, -22, 22, 22, 22, pHoriz, true, false);   // anti-q line (forward arrow, anti-particle)

                // Right vertical connector forms as horizontal propagators reach the right side
                const pRight = clamp((pInternal - 0.40) / 0.60, 0, 1);
                drawFermionLine(ctx, 22, -22, 22, 22, pRight, false);

                ctx.fillStyle = theme.text;
                drawLabel(ctx, 'q', 0, -31, pInternalLabel);
                drawLabel(ctx, 'q̄', 0, 31, pInternalLabel);

                ctx.fillStyle = theme.vertex;
                drawVertex(ctx, 22, -22, pVertex2);
                drawVertex(ctx, 22, 22, pVertex2);

                // 3) Out-correlators: outgoing photons
                ctx.strokeStyle = theme.photon;
                drawWavyLine(ctx, 22, -22, 65, -45, pOut, 3.5, 3.5);
                drawWavyLine(ctx, 22, 22, 65, 45, pOut, 3.5, 3.5);

                ctx.fillStyle = theme.text;
                drawLabel(ctx, 'γ₃', 72, -48, pOutLabel);
                drawLabel(ctx, 'γ₄', 72, 48, pOutLabel);
                break;
            }
        }
    }

    // --- Dynamic Pool of Feynman Quantum Fluctuation Diagrams ---
    const poolSize = 10;
    const diagrams = [];

    function spawnDiagram(initialDelay = 0) {
        const padX = Math.min(width * 0.08, 70);
        const padY = Math.min(height * 0.08, 60);
        return {
            type: Math.floor(Math.random() * 8),
            x: padX + Math.random() * (width - padX * 2),
            y: padY + Math.random() * (height - padY * 2),
            vx: (Math.random() - 0.5) * 6.0,
            vy: (Math.random() - 0.5) * 5.0,
            scale: 0.82 + Math.random() * 0.38,
            rotation: (Math.random() - 0.5) * 0.40,
            rotSpeed: (Math.random() - 0.5) * 0.03,
            age: 0,
            lifetime: 5.5 + Math.random() * 3.0, // seconds
            delay: initialDelay,
            peakAlpha: 0.52 + Math.random() * 0.32,
            breathPhase: Math.random() * Math.PI * 2
        };
    }

    // Stagger initial appearances across the first 7 seconds
    for (let i = 0; i < poolSize; i++) {
        diagrams.push(spawnDiagram(i * 0.75));
    }

    let lastTime = performance.now();

    function updateAndRender(now) {
        const dt = Math.min((now - lastTime) * 0.001, 0.1);
        lastTime = now;

    ctx.clearRect(0, 0, width, height);

        for (let i = 0; i < diagrams.length; i++) {
            const d = diagrams[i];

            if (d.delay > 0) {
                d.delay -= dt;
                continue;
            }

            d.age += dt;

            // When lifetime expires, respawn at a fresh location
            if (d.age >= d.lifetime) {
                diagrams[i] = spawnDiagram(0.3 + Math.random() * 1.5);
                continue;
            }

            const progress = d.age / d.lifetime;

            // Chronological sequence requested by user:
            // 1. In-correlators first (progress: 0.0 -> 0.26)
            const pIn = clamp(progress / 0.25, 0, 1);
            const pInLabel = clamp((progress - 0.03) / 0.16, 0, 1);

            // 2. Interaction vertices and internal correlators (progress: 0.22 -> 0.54)
            const pVertex1 = clamp((progress - 0.22) / 0.08, 0, 1);
            const pInternal = clamp((progress - 0.25) / 0.25, 0, 1);
            const pVertex2 = clamp((progress - 0.46) / 0.08, 0, 1);
            const pInternalLabel = clamp((progress - 0.28) / 0.16, 0, 1);

            // 3. Out-correlators appear (progress: 0.50 -> 0.76)
            const pOut = clamp((progress - 0.50) / 0.24, 0, 1);
            const pOutLabel = clamp((progress - 0.56) / 0.16, 0, 1);

            // 4. Vanishing dissolution into the quantum vacuum (progress: 0.80 -> 1.0)
            const appearFactor = clamp(progress / 0.06, 0, 1);
            const fadeFactor = clamp((1.0 - progress) / 0.18, 0, 1);
            const alpha = d.peakAlpha * appearFactor * fadeFactor;

            if (alpha <= 0.001) continue;

            // Gentle position drift & rotation
            d.x += d.vx * dt;
            d.y += d.vy * dt;
            d.rotation += d.rotSpeed * dt;

            // Subtle organic scale breathing
            const breathing = 1.0 + 0.04 * Math.sin(d.age * 1.8 + d.breathPhase);
            const currentScale = d.scale * breathing;

            ctx.save();
            ctx.translate(d.x, d.y);
            ctx.rotate(d.rotation);
            ctx.scale(currentScale, currentScale);

            ctx.globalAlpha = alpha;
            ctx.shadowColor = theme.glow;
            ctx.shadowBlur = 8 * alpha;

            renderDiagram(ctx, d.type, theme, {
                pIn,
                pInLabel,
                pVertex1,
                pInternal,
                pVertex2,
                pInternalLabel,
                pOut,
                pOutLabel
            });

            ctx.restore();
        }

        requestAnimationFrame(updateAndRender);
    }

    requestAnimationFrame(updateAndRender);
}
