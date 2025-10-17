// Função para adicionar eventos de clique aos cards
function addCardEvents() {
    // Eventos para expandir/contrair o card principal
    const cardHeaders = document.querySelectorAll('.card-header');
    cardHeaders.forEach(header => {
        header.addEventListener('click', function () {
            const cardBody = this.nextElementSibling;
            const toggleIcon = this.querySelector('.toggle-icon');

            cardBody.classList.toggle('expanded');
            toggleIcon.classList.toggle('rotate');
        });
    });

    // Eventos para expandir/contrair informações detalhadas
    const infoHeaders = document.querySelectorAll('.card-info .info-header');
    infoHeaders.forEach(header => {
        header.addEventListener('click', function (e) {
            e.stopPropagation(); // Impede que o evento propague para o card
            const infoDetails = this.nextElementSibling;
            const toggleIcon = this.querySelector('.toggle-icon.small');

            infoDetails.classList.toggle('expanded');
            toggleIcon.classList.toggle('rotate');
        });
    });
}