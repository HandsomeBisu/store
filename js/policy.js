document.addEventListener('DOMContentLoaded', () => {
    const policyContentDiv = document.getElementById('policy-content');
    const policyButtons = document.querySelectorAll('.policy-btn');

    // Basic Markdown to HTML converter
    function markdownToHtml(markdown) {
        let html = markdown
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>
')
            .replace(/^# (.*$)/gim, '<h1>$1</h1>
')
            .replace(/\*\*(.*?)__/gim, '<strong>$1</strong>') // Bold
            .replace(/\*(.*?)\*/gim, '<em>$1</em>') // Italic
            .replace(/^- (.*$)/gim, '<li>$1</li>
') // List items
            .replace(/^\s*\n/gim, '<br>') // Paragraphs
            .replace(/\n/gim, '<p>');
        return html.trim();
    }

    async function loadPolicy(policyName) {
        try {
            const response = await fetch(`${policyName}.txt`);
            if (!response.ok) {
                throw new Error(`Failed to load ${policyName}.txt: ${response.statusText}`);
            }
            const markdown = await response.text();
            policyContentDiv.textContent = markdown; // Display raw Markdown for debugging
        } catch (error) {
            console.error('Error loading policy:', error);
            policyContentDiv.textContent = `정책 내용을 불러오는 데 실패했습니다: ${error.message}`;
        }
    }

    policyButtons.forEach(button => {
        button.addEventListener('click', () => {
            policyButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            const policyName = button.dataset.policy;
            loadPolicy(policyName);
        });
    });

    // Load default policy based on URL parameter or first button
    const urlParams = new URLSearchParams(window.location.search);
    const initialPolicy = urlParams.get('policy') || policyButtons[0].dataset.policy;
    
    // Set active class for initial policy button
    policyButtons.forEach(button => {
        if (button.dataset.policy === initialPolicy) {
            button.classList.add('active');
        }
    });
    loadPolicy(initialPolicy);
});
