const canvas = document.getElementById('starsCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function alignIconsToArch() {
    const R = 300; 
    const GAP = 12; 

    ['left', 'right'].forEach(side => {
        const col = document.querySelector(`.floating-icons.${side}`);
        if (!col) return;
        const containerRect = col.parentElement.getBoundingClientRect();

        col.querySelectorAll('.icon').forEach(icon => {
            const iconRect = icon.getBoundingClientRect();
            const iconCenterY = (iconRect.top + iconRect.height / 2) - containerRect.top;
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

const stars = [];
const numStars = 700;
const maxR = 1500;

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
        const formatICSDate = (d) => {
            if (isNaN(d.getTime())) return "";
            return d.getUTCFullYear() +
                String(d.getUTCMonth() + 1).padStart(2, '0') +
                String(d.getUTCDate()).padStart(2, '0') + 'T' +
                String(d.getUTCHours()).padStart(2, '0') +
                String(d.getUTCMinutes()).padStart(2, '0') +
                String(d.getUTCSeconds()).padStart(2, '0') + 'Z';
        };
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
    statusBox.addEventListener('click', function() {
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

// Lightbox Logic
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const lightboxCaption = document.getElementById('lightbox-caption');
const lightboxClose = document.querySelector('.lightbox-close');
const lightboxPrev = document.querySelector('.lightbox-prev');
const lightboxNext = document.querySelector('.lightbox-next');

let currentIndex = 0;
let lightboxItems = [];

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

function openLightbox(index) {
    currentIndex = index;
    updateLightbox();
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
}

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

function initLightbox() {
    const triggers = document.querySelectorAll('.lightbox-trigger');
    lightboxItems = Array.from(triggers).map(trigger => ({
        src: trigger.getAttribute('data-image') || trigger.querySelector('img')?.src,
        caption: trigger.getAttribute('data-caption') || trigger.querySelector('img')?.alt || ''
    }));
    triggers.forEach((trigger, index) => {
        trigger.onclick = () => openLightbox(index);
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

// Gallery Logic
const GALLERY_CONFIG = [
    { 
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

function formatDate(dateStr) {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const month = months[parseInt(parts[1]) - 1];
    return month ? `${month} ${parseInt(parts[0])}, ${parts[2]}` : dateStr;
}

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
            const path = `${event.folder}/${imgName}`;
            const item = document.createElement('div');
            item.className = 'photo-item lightbox-trigger';
            item.setAttribute('data-image', path);
            item.setAttribute('data-caption', h2.textContent);
            
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
                setTimeout(() => { if(!isCollapsed) grid.style.maxHeight = 'none'; }, 600);
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

// Event Modal Logic
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
            modalAbstractSection.style.display = 'block';
            modalSlidesContainer.style.display = 'none';
            slidesIframe.src = '';

            if (slidesUrl && slidesUrl !== '#') {
                viewSlidesBtn.style.display = 'inline-flex';
                downloadSlidesBtn.style.display = 'inline-flex';
                downloadSlidesBtn.href = slidesUrl;
                
                // Store slides URL for the viewer
                viewSlidesBtn.onclick = () => {
                    modalAbstractSection.style.display = 'none';
                    modalSlidesContainer.style.display = 'block';
                    viewSlidesBtn.style.display = 'none';
                    
                    // Construct Office Viewer URL
                    let publicUrl;
                    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                        // Fallback for local development: Use the public GitHub URL
                        // This allows the Office Viewer to "see" the file while you are on localhost.
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

            // Show modal
            eventModal.classList.add('active');
            document.body.style.overflow = 'hidden';

            // Reset abstract toggle to English
            if (abstractToggle) {
                abstractToggle.querySelectorAll('.abstract-toggle-btn').forEach(btn => {
                    btn.classList.toggle('active', btn.getAttribute('data-lang') === 'en');
                });
                modalAbstractEn.classList.add('active');
                modalAbstractCz.classList.remove('active');
            }
        });
    });

    // Special behavior: clicking the abstract section can also reveal the slides button if not visible
    if (modalAbstractSection) {
        modalAbstractSection.addEventListener('click', () => {
            if (viewSlidesBtn.style.display !== 'none') {
                // If the user clicks the abstract, we can trigger the view slides action
                viewSlidesBtn.click();
            }
        });
    }

    if (modalClose) {
        modalClose.onclick = () => {
            eventModal.classList.remove('active');
            document.body.style.overflow = '';
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
        }
    };
}

window.addEventListener('DOMContentLoaded', () => {
    renderGallery();
    initEventModal();
});
