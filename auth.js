(function() {
    // Check if user is authenticated
    if (sessionStorage.getItem('authenticated') !== 'true') {
        window.location.href = '/login.html';
    }
    
    // Add logout functionality
    document.addEventListener('DOMContentLoaded', function() {
        // Create logout button
        const logoutBtn = document.createElement('button');
        logoutBtn.textContent = 'Logout';
        logoutBtn.className = 'px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors';
        
        // Add click handler
        logoutBtn.addEventListener('click', function() {
            sessionStorage.removeItem('authenticated');
            window.location.href = '/login.html';
        });
        
        // Add to page
        const header = document.querySelector('h1').parentElement;
        const wrapper = document.createElement('div');
        wrapper.className = 'flex justify-between items-center mb-8';
        wrapper.appendChild(document.querySelector('h1'));
        wrapper.appendChild(logoutBtn);
        header.appendChild(wrapper);
    });
})();
