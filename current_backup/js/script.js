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
            dropdownMenu.classList.toggle('show');
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
}); 