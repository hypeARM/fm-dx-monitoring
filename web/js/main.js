document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.station-panel-container').forEach(container => {
        const panel = container.querySelector('.station-panel');

        if (!panel) return;
                  
        panel.addEventListener('click', function(event) {
            event.stopPropagation();
            const details = container.querySelector('.station-panel-details');

            if (!details) return;
                
            const isVisible = details.style.display === 'block';
            details.style.display = isVisible ? 'none' : 'block';
            isVisible ? container.classList.remove('active') : container.classList.add('active');
        });
    });
});