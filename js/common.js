// Dados Globais
export let despesasExemplo = JSON.parse(localStorage.getItem('despesas')) || [
    { titulo: 'Supermercado', categoria: 'Alimentação', pagamento: 'Cartão de Crédito', valor: 350.0, data: '10/03/2026', observacao: '' },
    { titulo: 'Uber', categoria: 'Transporte', pagamento: 'Cartão de Débito', valor: 45.0, data: '10/03/2026', observacao: '' }
];

export let metas = JSON.parse(localStorage.getItem('metas')) || [];
export let limiteMensal = parseFloat(localStorage.getItem('budget_total')) || 0;

// Utilitários de Formatação
export const formatarMoeda = (valor) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
export const tratarClasseCategoria = (cat) => cat.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s/g, '-');
export const getHojeFormatado = () => new Date().toLocaleDateString('pt-BR');

// Persistência
export function salvarNoStorage() {
    localStorage.setItem('despesas', JSON.stringify(despesasExemplo));
    localStorage.setItem('metas', JSON.stringify(metas));
    localStorage.setItem('budget_total', limiteMensal.toString());
}

// Máscaras
export function aplicarMascaraValor(input) {
    let value = input.value.replace(/\D/g, '');
    let valorFloat = (parseFloat(value) / 100).toFixed(2);
    input.value = isNaN(valorFloat) ? "" : new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(valorFloat);
}


    
