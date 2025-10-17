// Navegação por botões - VERSÃO CORRIGIDA
document.addEventListener('DOMContentLoaded', function () {
    const stateList = document.getElementById('state-list');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const stateItems = document.querySelectorAll('.state li');
    const stateContainer = document.querySelector('.state');

    // Configuração inicial
    let currentPosition = 0;
    const itemWidth = 80; // Largura aproximada de cada item (70px + margens)

    // Função para calcular itens visíveis CORRETAMENTE
    function calculateVisibleItems() {
        const containerWidth = stateContainer.offsetWidth;
        const totalItemsWidth = stateItems.length * itemWidth;

        // Se todos os itens cabem no container, não precisa de navegação
        if (totalItemsWidth <= containerWidth) {
            return stateItems.length;
        }

        // Calcula quantos itens cabem visíveis
        return Math.floor(containerWidth / itemWidth);
    }

    // Função para calcular posição máxima CORRETAMENTE
    function calculateMaxPosition() {
        const visibleItems = calculateVisibleItems();
        const maxPosition = Math.max(0, stateItems.length - visibleItems);
        return maxPosition;
    }

    // Função para atualizar a posição da lista
    function updatePosition() {
        const maxPosition = calculateMaxPosition();

        // Limitar a posição atual
        currentPosition = Math.max(0, Math.min(currentPosition, maxPosition));

        // Aplicar transformação
        stateList.style.transform = `translateX(-${currentPosition * itemWidth}px)`;

        // Atualizar estado dos botões
        const isAtStart = currentPosition === 0;
        const isAtEnd = currentPosition >= maxPosition;

        prevBtn.disabled = isAtStart;
        nextBtn.disabled = isAtEnd;

        // Aplicar estilos aos botões desabilitados
        prevBtn.style.opacity = isAtStart ? '0.5' : '1';
        prevBtn.style.cursor = isAtStart ? 'not-allowed' : 'pointer';
        nextBtn.style.opacity = isAtEnd ? '0.5' : '1';
        nextBtn.style.cursor = isAtEnd ? 'not-allowed' : 'pointer';
    }

    // Navegação para a esquerda
    prevBtn.addEventListener('click', function () {
        if (currentPosition > 0) {
            currentPosition--;
            updatePosition();
        }
    });

    // Navegação para a direita
    nextBtn.addEventListener('click', function () {
        const maxPosition = calculateMaxPosition();
        if (currentPosition < maxPosition) {
            currentPosition++;
            updatePosition();
        }
    });

    // Inicializar posição
    updatePosition();

    // Ajustar ao redimensionar a janela
    window.addEventListener('resize', function () {
        updatePosition();
    });

    // Forçar atualização após um pequeno delay para garantir que o DOM esteja totalmente renderizado
    setTimeout(updatePosition, 100);
});