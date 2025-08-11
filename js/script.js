// Dropdown menu functionality
document.addEventListener('DOMContentLoaded', function() {
    const hamburger = document.querySelector('.hamburger');
    const dropdownMenu = document.getElementById('dropdown-menu');
    let backdrop = document.querySelector('.dropdown-backdrop');

    // Create backdrop if it doesn't exist
    if (!backdrop) {
        backdrop = document.createElement('div');
        backdrop.className = 'dropdown-backdrop';
        document.body.appendChild(backdrop);
    }

    // Hamburger menu click
    if (hamburger) {
        hamburger.addEventListener('click', function() {
            dropdownMenu.classList.toggle('active');
            backdrop.classList.toggle('show');
        });
    }

    // Backdrop click to close menu
    backdrop.addEventListener('click', function() {
        dropdownMenu.classList.remove('show');
        backdrop.classList.remove('show');
    });

    // Close menu when clicking outside
    document.addEventListener('click', function(event) {
        if (!hamburger.contains(event.target) && !dropdownMenu.contains(event.target)) {
            dropdownMenu.classList.remove('show');
            backdrop.classList.remove('show');
        }
    });

    // Close menu when pressing Escape key
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            dropdownMenu.classList.remove('show');
            backdrop.classList.remove('show');
        }
    });

    // Counter animation on scroll
    const counters = document.querySelectorAll('.counter');
    const options = {
        threshold: 0.5,
        rootMargin: '0px 0px -100px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
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
                observer.unobserve(counter); // Only animate once
            }
        });
    }, options);

    counters.forEach(counter => {
        observer.observe(counter);
    });
}); 

document.addEventListener('DOMContentLoaded', function() {
    const submenuParents = document.querySelectorAll('.has-submenu > a');

    submenuParents.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault(); // stop the link from navigating immediately

            document.querySelectorAll('.has-submenu').forEach(item => {
                if (item !== link.parentElement) {
                    item.classList.remove('open');
                }
            });

            link.parentElement.classList.toggle('open');
        });
    });
});

document.addEventListener('DOMContentLoaded', function() {
    const hamburger = document.querySelector('.hamburger');
    const dropdownMenu = document.getElementById('dropdown-menu');

    if (hamburger) {
        hamburger.addEventListener('click', () => {
            dropdownMenu.style.display = 
                dropdownMenu.style.display === 'flex' ? 'none' : 'flex';
        });
    }

    // ✅ Submenu toggle
    const submenuParents = document.querySelectorAll('.has-submenu > a');
    submenuParents.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            link.parentElement.classList.toggle('open');
        });
    });
});
