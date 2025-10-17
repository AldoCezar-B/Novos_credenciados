// Header recolhível
document.addEventListener('DOMContentLoaded', function () {
    const header = document.querySelector('header');
    let collapseTimer;

    // Função para recolher o header
    function collapseHeader() {
        header.classList.add('collapsed');
    }

    // Inicia o timer para recolher após 5 segundos (5000ms)
    function startCollapseTimer() {
        collapseTimer = setTimeout(collapseHeader, 5000);
    }

    // Cancela o timer quando o mouse está sobre o header
    function cancelCollapse() {
        clearTimeout(collapseTimer);
        header.classList.remove('collapsed');
    }

    // Reinicia o timer quando o mouse sai do header
    function restartCollapseTimer() {
        startCollapseTimer();
    }

    // Event listeners
    header.addEventListener('mouseenter', cancelCollapse);
    header.addEventListener('mouseleave', restartCollapseTimer);

    // Inicia o timer inicial
    startCollapseTimer();
});

// Script Refresh
function refreshPage() {
    location.reload();
}