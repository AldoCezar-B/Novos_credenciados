// Dados iniciais vazios
let credenciados = [];
const estados = {
    "AC": "Acre", "AL": "Alagoas", "AM": "Amazonas", "AP": "Amapá", "BA": "Bahia",
    "CE": "Ceará", "DF": "Distrito Federal", "ES": "Espírito Santo", "GO": "Goiás",
    "MA": "Maranhão", "MG": "Minas Gerais", "MS": "Mato Grosso do Sul", "MT": "Mato Grosso",
    "PA": "Pará", "PB": "Paraíba", "PE": "Pernambuco", "PI": "Piauí", "PR": "Paraná",
    "RJ": "Rio de Janeiro", "RN": "Rio Grande do Norte", "RO": "Rondônia", "RR": "Roraima",
    "RS": "Rio Grande do Sul", "SC": "Santa Catarina", "SE": "Sergipe", "SP": "São Paulo",
    "TO": "Tocantins"
};

// Elementos DOM
let stateElements;
let stateTitle;
let searchInput;
let cardsContainer;
let loadingElement;
let errorElement;
let stateMenuItems;

let selectedState = null;

// Função para inicializar a aplicação
function initializeApp() {
    // Inicializar elementos DOM
    stateElements = document.querySelectorAll('#svg-map a');
    stateTitle = document.getElementById('state-title');
    searchInput = document.getElementById('search-input');
    cardsContainer = document.getElementById('cards-container');
    loadingElement = document.getElementById('loading');
    errorElement = document.getElementById('error');
    stateMenuItems = document.querySelectorAll('.state li');

    // Configurar event listeners
    setupEventListeners();
    
    // Iniciar carregamento dos dados
    loadRemoteCSV();
}

// Função para configurar event listeners
function setupEventListeners() {
    // Eventos para os estados no mapa
    stateElements.forEach(state => {
        state.addEventListener('click', () => {
            stateElements.forEach(s => s.classList.remove('selected'));
            state.classList.add('selected');
            selectedState = state.id;

            // Atualizar menu de estados
            stateMenuItems.forEach(item => {
                item.classList.remove('active');
                if (item.getAttribute('data-state') === selectedState) {
                    item.classList.add('active');
                }
            });

            filterCredenciados();
        });

        // Tooltips
        state.addEventListener('mouseover', (e) => {
            const stateCode = e.target.id;
            const stateName = estados[stateCode];
            e.target.setAttribute('title', stateName);
        });
    });

    // Eventos para os itens do menu de estados
    stateMenuItems.forEach(item => {
        item.addEventListener('click', () => {
            const stateCode = item.getAttribute('data-state');

            // Remover seleção anterior
            stateElements.forEach(s => s.classList.remove('selected'));
            stateMenuItems.forEach(i => i.classList.remove('active'));

            // Adicionar seleção atual
            item.classList.add('active');

            // Encontrar e selecionar o estado correspondente no mapa
            const stateElement = document.getElementById(stateCode);
            if (stateElement) {
                stateElement.classList.add('selected');
            }

            selectedState = stateCode;
            filterCredenciados();
        });
    });

    // Evento de busca
    searchInput.addEventListener('input', filterCredenciados);

    // Evento para limpar seleção ao clicar no título
    stateTitle.addEventListener('click', () => {
        stateElements.forEach(s => s.classList.remove('selected'));
        stateMenuItems.forEach(i => i.classList.remove('active'));
        selectedState = null;
        searchInput.value = '';
        displayFirstFiveCredenciados();
    });
}

// Função para obter o nome a ser exibido baseado no NO_LIVRO
function getDisplayName(credenciado) {
    // Se NO_LIVRO for "fantasia", usar nome_2 (FANTASIA)
    if (credenciado.preferencia && credenciado.preferencia.toLowerCase() === 'fantasia') {
        return credenciado.nome_2 || credenciado.nome_1 || "";
    }
    // Se NO_LIVRO for "nome" ou qualquer outro valor, usar nome_1 (NO_PRESTADOR)
    else {
        return credenciado.nome_1 || credenciado.nome_2 || "";
    }
}

// Função para processar o CSV
function processCSV(csvData) {
    const lines = csvData.split('\n');
    credenciados = [];

    // Pular cabeçalho se existir
    const startLine = lines[0].includes('NO_PRESTADOR') || lines[0].includes('estado') ? 1 : 0;

    for (let i = startLine; i < lines.length; i++) {
        if (lines[i].trim() === '') continue;

        const columns = lines[i].split(';');
        if (columns.length >= 6) {
            credenciados.push({
                nome_1: columns[0]?.trim() || "", // NO_PRESTADOR
                nome_2: columns[1]?.trim() || "", // FANTASIA
                preferencia: columns[2]?.trim() || "", // NO_LIVRO

                cep: columns[3]?.trim() || "", // CEP
                numero: columns[4]?.trim() || "", // NUMERO

                logradouro: columns[5]?.trim() || "", // LOGRADOURO
                bairo: columns[6]?.trim() || "", // BAIRRO
                municipio: columns[7]?.trim() || "", // MUNICIPIO
                estado: columns[8]?.trim() || "", // UF
                regiao_saude: columns[9]?.trim() || "", // REGIAO_SAUDE

                categoria: columns[10]?.trim() || "", // ESPECIALIDADES

                ddd_tel_1: columns[11]?.trim() || "", // DDD_TELEFONE1
                telefone_1: columns[12]?.trim() || "", // TELEFONE1
                ddd_tel_2: columns[13]?.trim() || "", // DDD_TELEFONE2
                telefone_2: columns[14]?.trim() || "", // TELEFONE2

                ddd_cel: columns[15]?.trim() || "", // DDD_CELULAR
                celular: columns[16]?.trim() || "", // CELULAR
                data_cred: columns[17]?.trim() || "" // DT_CREDENCIAMENTO
            });
        }
    }

    // Atualizar contadores dos estados
    updateStateCounters();

    // Exibir os primeiros 5 credenciados por padrão
    displayFirstFiveCredenciados();
    loadingElement.style.display = 'none';
}

// Função para atualizar os contadores dos estados
function updateStateCounters() {
    // Contar credenciados por estado
    const stateCounts = {};

    // Inicializar contadores
    Object.keys(estados).forEach(state => {
        stateCounts[state] = 0;
    });

    // Contar credenciados por estado
    credenciados.forEach(credenciado => {
        if (estados[credenciado.estado]) {
            stateCounts[credenciado.estado]++;
        }
    });

    // Atualizar as bolinhas de contador
    stateMenuItems.forEach(item => {
        const stateCode = item.getAttribute('data-state');
        const count = stateCounts[stateCode] || 0;
        const badge = item.querySelector('.count-badge');

        if (badge) {
            badge.textContent = count;

            // Ocultar bolinha se não há credenciados
            if (count === 0) {
                badge.style.display = 'none';
            } else {
                badge.style.display = 'flex';
            }
        }
    });
}

// Função para exibir os primeiros credenciados
function displayFirstFiveCredenciados() {
    const firstFive = credenciados.slice(0, 100);
    stateTitle.textContent = "Novos credenciados";
    displayCredenciados(firstFive);
}

// Função para carregar o CSV
async function loadRemoteCSV() {
    try {
        loadingElement.style.display = 'block';
        errorElement.style.display = 'none';
        errorElement.textContent = '';

        const response = await fetch('../Data/credenciados_2025.csv');

        if (!response.ok) {
            throw new Error(`Erro ${response.status}: ${response.statusText}`);
        }

        const csvData = await response.text();
        processCSV(csvData);

        // Atualiza a cada 5 minutos
        setTimeout(loadRemoteCSV, 300000);

    } catch (error) {
        console.error('Erro ao carregar CSV:', error);
        errorElement.textContent = `Erro ao carregar dados: ${error.message}`;
        errorElement.style.display = 'block';
        loadingElement.style.display = 'none';

        // Tentar novamente após 1 minuto
        setTimeout(loadRemoteCSV, 60000);
    }
}

// Função para exibir os credenciados
function displayCredenciados(credenciadosToDisplay) {
    cardsContainer.innerHTML = '';
    const searchTerm = searchInput.value.toLowerCase();

    if (credenciadosToDisplay.length === 0) {
        cardsContainer.innerHTML = '<div class="no-results">Nenhum credenciado encontrado</div>';
        return;
    }

    // Função para destacar o texto
    const highlightText = (text, term) => {
        if (!term || !text) return text;

        try {
            const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
            return text.replace(regex, '<span class="highlight">$1</span>');
        } catch (e) {
            return text;
        }
    };

    // Função para formatar categorias como lista
    const formatCategory = (category, term) => {
        if (!category) return '<span class="no-category">Nenhuma especialidade informada</span>';

        // Divide as especialidades usando o separador "/"
        const categories = category.split('/').map(cat => cat.trim()).filter(cat => cat !== '');

        if (categories.length === 0) {
            return '<span class="no-category">Nenhuma especialidade informada</span>';
        }

        // Se houver apenas uma especialidade, mostra normalmente
        if (categories.length === 1) {
            return `<div class="specialty-single">${highlightText(categories[0], term)}</div>`;
        }

        // Para múltiplas especialidades, cria uma lista
        const specialtyItems = categories.map(cat =>
            `<div class="specialty-item">${highlightText(cat, term)}</div>`
        ).join('');

        return `<div class="specialty-list">${specialtyItems}</div>`;
    };

    // Criar cards para cada credenciado
    credenciadosToDisplay.forEach(credenciado => {
        const card = document.createElement('div');
        card.className = 'card';

        // Obter o nome a ser exibido baseado no NO_LIVRO
        const displayName = getDisplayName(credenciado);

        card.innerHTML = `
            <div class="card-header">
                <div class="state-badge">${credenciado.estado}</div>
                <h3 class="fantasia">${highlightText(displayName, searchTerm)}</h3>
                <img src="https://img.icons8.com/?size=100&id=1806&format=png&color=002D4B" 
                     alt="Expandir" class="toggle-icon">
            </div>
            <div class="card-body">
                <div class="card-info category-card">
                    <div class="info-header">
                        <div class="info-content">
                            <img src="https://img.icons8.com/?size=100&id=8169&format=png&color=002D4B" alt="Especialidades" class="ico">
                            <p class="information">Especialidades</p>
                        </div>
                        <img src="https://img.icons8.com/?size=100&id=1806&format=png&color=002D4B" 
                             alt="Expandir" class="toggle-icon small category-toggle">
                    </div>
                    <div class="info-details">
                        ${formatCategory(credenciado.categoria, searchTerm)}
                    </div>
                </div>
                <div class="divisao"></div>
                <div class="card-info">
                    <div class="info-header">
                        <div class="info-content">
                            <img src="https://img.icons8.com/?size=100&id=9659&format=png&color=002D4B" alt="Telefone" class="ico">
                            <p class="information">Contato</p>
                        </div>
                        <img src="https://img.icons8.com/?size=100&id=1806&format=png&color=2F54CF" 
                             alt="Expandir" class="toggle-icon small">
                    </div>
                    
                    <div class="info-details">
                        <ul>
                            <li class="dados">
                                Celular: ${credenciado.ddd_cel}
                                ${credenciado.celular}
                            </li>
                            <li class="dados">
                                Telefone 1:  ${credenciado.ddd_tel_1} ${credenciado.telefone_1}
                            </li>
                            <li class="dados">
                                Telefone 2: ${credenciado.ddd_tel_2} ${credenciado.telefone_2}
                            </li>
                        </ul>
                    </div>
                </div>
                
                <div class="card-info">
                    <div class="info-header">
                        <div class="info-content">
                            <img src="https://img.icons8.com/?size=100&id=YyEbAVyRYrMX&format=png&color=002D4B" alt="Localização" class="ico">
                            <p class="information">Endereço</p>
                        </div>
                        <img src="https://img.icons8.com/?size=100&id=1806&format=png&color=2F54CF" 
                             alt="Expandir" class="toggle-icon small">
                    </div>
                    <div class="info-details">
                        <li class="dados">${credenciado.logradouro}, ${credenciado.numero}, ${credenciado.bairo} <br> ${credenciado.municipio}, ${credenciado.estado}, ${credenciado.cep}
                        </li>                       
                    </div>
                </div>
            </div>
        `;

        cardsContainer.appendChild(card);
    });

    // Adicionar eventos de clique após criar os cards
    addCardEvents();
}

// Função para filtrar credenciados
function filterCredenciados() {
    console.log('Filtrando...', 'Termo:', searchInput.value, 'Estado:', selectedState);

    let filtered = credenciados;
    const searchTerm = searchInput.value.toLowerCase().trim();

    // Filtrar por estado se selecionado
    if (selectedState) {
        filtered = filtered.filter(credenciado => credenciado.estado === selectedState);
        stateTitle.textContent = `Novos Credenciados em ${estados[selectedState]}`;
    } else {
        stateTitle.textContent = "Novos Credenciados em Destaque";
    }

    // Filtrar por termo de busca se existir
    if (searchTerm) {
        filtered = filtered.filter(credenciado => {
            // Usar a mesma lógica do getDisplayName para busca
            const displayName = getDisplayName(credenciado);

            return (
                (displayName && displayName.toLowerCase().includes(searchTerm)) ||
                (credenciado.municipio && credenciado.municipio.toLowerCase().includes(searchTerm)) ||
                (credenciado.categoria && credenciado.categoria.toLowerCase().includes(searchTerm)) ||
                (credenciado.regiao_saude && credenciado.regiao_saude.toLowerCase().includes(searchTerm)) ||
                (credenciado.nome_1 && credenciado.nome_1.toLowerCase().includes(searchTerm)) ||
                (credenciado.nome_2 && credenciado.nome_2.toLowerCase().includes(searchTerm)) ||
                (credenciado.preferencia && credenciado.preferencia.toLowerCase().includes(searchTerm))
            );
        });
    }

    // Se não há filtros ativos, mostrar os primeiros definir limite
    if (!selectedState && !searchTerm) {
        displayFirstFiveCredenciados();
        return;
    }

    console.log('Resultados filtrados:', filtered.length);
    displayCredenciados(filtered);
}