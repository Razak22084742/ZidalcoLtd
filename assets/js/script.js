// ======= PAGE FADE-IN =======
window.addEventListener('DOMContentLoaded', () => {
    document.body.classList.add('fade-in-page');
});

// ======= HEADER SHADOW ON SCROLL =======
window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        document.querySelector('header').classList.add('scrolled');
    } else {
        document.querySelector('header').classList.remove('scrolled');
    }
});

// ======= MOBILE MENU TOGGLE =======
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('nav-links');

if (hamburger) {
    hamburger.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        hamburger.classList.toggle('open');
    });
}

// ======= PORTFOLIO FILTER =======
const filterButtons = document.querySelectorAll('.filter-btn');
const portfolioItems = document.querySelectorAll('.portfolio-item');

if (filterButtons.length > 0) {
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(button => button.classList.remove('active'));
            btn.classList.add('active');

            const filter = btn.getAttribute('data-filter');

            portfolioItems.forEach(item => {
                if (filter === 'all' || item.classList.contains(filter)) {
                    item.style.display = 'block';
                    setTimeout(() => item.style.opacity = '1', 100);
                } else {
                    item.style.opacity = '0';
                    setTimeout(() => item.style.display = 'none', 300);
                }
            });
        });
    });
}

// ======= SCROLL ANIMATIONS (Fade + Stagger) =======
const fadeElements = document.querySelectorAll('.fade-in');
const staggerElements = document.querySelectorAll('.stagger');

function handleScrollAnimation() {
    fadeElements.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight - 100) {
            el.classList.add('visible');
        }
    });

    staggerElements.forEach((el, index) => {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight - 100) {
            setTimeout(() => {
                el.classList.add('visible');
            }, index * 200);
        }
    });
}

window.addEventListener('scroll', handleScrollAnimation);
window.addEventListener('load', handleScrollAnimation);

// ====== NOTIFICATION POPUP ======
function showNotification(message, isError = false) {
    const notification = document.getElementById('feedbackNotification');
    notification.textContent = message;

    if (isError) {
        notification.classList.add('error');
    } else {
        notification.classList.remove('error');
    }

    notification.classList.add('show');

    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// ====== CUSTOMER FEEDBACK AJAX WITH FADE-IN & NOTIFICATIONS ======
const feedbackForm = document.getElementById('feedbackForm');
const commentsList = document.getElementById('commentsList');

function loadComments() {
    fetch('load_comments.php')
        .then(res => res.text())
        .then(data => {
            commentsList.innerHTML = data;

            const commentItems = document.querySelectorAll('.comment');
            commentItems.forEach((comment, index) => {
                setTimeout(() => {
                    comment.classList.add('visible');
                }, index * 100);
            });
        });
}

if (feedbackForm) {
    feedbackForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const formData = new FormData(feedbackForm);

        fetch('save_comment.php', {
            method: 'POST',
            body: formData
        })
        .then(res => res.text())
        .then(data => {
            if (data.trim() === "success") {
                feedbackForm.reset();
                loadComments();
                showNotification("✅ Your feedback was submitted!");

                setTimeout(() => {
                    const firstComment = document.querySelector('.comment');
                    if (firstComment) {
                        firstComment.classList.add('visible');
                    }
                }, 200);
            } else {
                showNotification("❌ Failed to submit comment. Try again.", true);
            }
        })
        .catch(() => showNotification("❌ Network error. Please try again later.", true));

    });

    document.addEventListener('DOMContentLoaded', loadComments);
}
// ====== CHARACTER COUNTER FOR FEEDBACK ======
// ====== CHARACTER COUNTER FOR FEEDBACK ======
const feedbackMessage = document.getElementById('feedbackMessage');
const charCount = document.getElementById('charCount');

if (feedbackMessage && charCount) {
    feedbackMessage.addEventListener('input', () => {
        const length = feedbackMessage.value.length;
        charCount.textContent = length;

        if (length > 450) {
            charCount.classList.add('warning');
        } else {
            charCount.classList.remove('warning');
        }
    });
}
const serviceCards = document.querySelectorAll('.card');

function animateServices() {
    serviceCards.forEach((card, index) => {
        const rect = card.getBoundingClientRect();
        if (rect.top < window.innerHeight - 100) {
            setTimeout(() => {
                card.classList.add('visible');
            }, index * 150);
        }
    });
}

window.addEventListener('scroll', animateServices);
window.addEventListener('load', animateServices);
// ====== Animated Counters for Why Choose Us ======
document.addEventListener('DOMContentLoaded', function() {
    const counters = document.querySelectorAll('.counter');
    console.log('Found counter elements:', counters.length);
    
    if (counters.length > 0) {
        // Use Intersection Observer for better performance
        const counterOptions = {
            threshold: 0.5,
            rootMargin: '0px 0px -100px 0px'
        };

        const counterObserver = new IntersectionObserver(function(entries) {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    console.log('Counter animation triggered!');
                    const counter = entry.target;
                    const target = parseInt(counter.getAttribute('data-target'));
                    const duration = 2000; // 2 seconds
                    const increment = target / (duration / 16); // 60fps
                    let current = 0;

                    const updateCounter = () => {
                        current += increment;
                        if (current < target) {
                            counter.textContent = Math.floor(current);
                            requestAnimationFrame(updateCounter);
                        } else {
                            counter.textContent = target;
                        }
                    };

                    updateCounter();
                    counterObserver.unobserve(counter); // Only animate once
                }
            });
        }, counterOptions);

        // Observe all counter elements
        counters.forEach(counter => {
            counterObserver.observe(counter);
        });
    }
});

// Ensure clicking links in dropdown navigates correctly
document.querySelectorAll('#dropdown-menu a').forEach(link => {
    link.addEventListener('click', function (e) {
        e.stopPropagation(); // ✅ Prevent dropdown toggle interfering
        window.location.href = this.getAttribute('href');
    });
});
// ======= DROPDOWN MENU FUNCTIONALITY =======
const hamburger = document.getElementById('hamburger');
const dropdownMenu = document.getElementById('dropdown-menu');

if (hamburger && dropdownMenu) {
    hamburger.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownMenu.style.display = dropdownMenu.style.display === 'block' ? 'none' : 'block';
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!hamburger.contains(e.target) && !dropdownMenu.contains(e.target)) {
            dropdownMenu.style.display = 'none';
        }
    });

    // Prevent page scroll when hovering over menu
    dropdownMenu.addEventListener('wheel', (e) => {
        e.stopPropagation();  // ✅ Keeps dropdown stable
    });
}
