export interface AreaOAB {
  id: string;
  nome: string;
  pesoHistorico: number;
  questoesTipicas: number;
}

export const AREAS_OAB_1FASE: AreaOAB[] = [
  { id: 'etica', nome: 'Ética e Estatuto da OAB', pesoHistorico: 10, questoesTipicas: 8 },
  { id: 'constitucional', nome: 'Direito Constitucional', pesoHistorico: 12, questoesTipicas: 10 },
  { id: 'civil', nome: 'Direito Civil', pesoHistorico: 12, questoesTipicas: 10 },
  { id: 'penal', nome: 'Direito Penal', pesoHistorico: 8, questoesTipicas: 6 },
  { id: 'trabalho', nome: 'Direito do Trabalho', pesoHistorico: 8, questoesTipicas: 6 },
  { id: 'tributario', nome: 'Direito Tributário', pesoHistorico: 8, questoesTipicas: 6 },
  { id: 'administrativo', nome: 'Direito Administrativo', pesoHistorico: 8, questoesTipicas: 6 },
  { id: 'empresarial', nome: 'Direito Empresarial', pesoHistorico: 7, questoesTipicas: 6 },
  { id: 'processo_civil', nome: 'Processo Civil', pesoHistorico: 8, questoesTipicas: 6 },
  { id: 'processo_penal', nome: 'Processo Penal', pesoHistorico: 6, questoesTipicas: 5 },
  { id: 'consumidor', nome: 'Direito do Consumidor', pesoHistorico: 4, questoesTipicas: 3 },
  { id: 'previdenciario', nome: 'Direito Previdenciário', pesoHistorico: 3, questoesTipicas: 3 },
  { id: 'ambiental', nome: 'Direito Ambiental', pesoHistorico: 2, questoesTipicas: 2 },
  { id: 'crianca', nome: 'ECA — Direito da Criança e Adolescente', pesoHistorico: 2, questoesTipicas: 2 },
  { id: 'internacional', nome: 'Direito Internacional', pesoHistorico: 1, questoesTipicas: 1 },
  { id: 'filosofia', nome: 'Filosofia do Direito / Sociologia', pesoHistorico: 1, questoesTipicas: 1 },
];

export const META_APROVACAO = {
  totalQuestoes: 80,
  minAcertos: 40,
  percentual: 50,
};

const DISCIPLINA_MAP: Record<string, string> = {
  etica: 'etica-e-estatuto-da-oab',
  constitucional: 'direito-constitucional',
  civil: 'direito-civil',
  penal: 'direito-penal',
  trabalho: 'direito-do-trabalho',
  tributario: 'direito-tributario',
  administrativo: 'direito-administrativo',
  empresarial: 'direito-empresarial',
  processo_civil: 'processo-civil',
  processo_penal: 'processo-penal',
  consumidor: 'direito-do-consumidor',
  previdenciario: 'direito-previdenciario',
  ambiental: 'direito-ambiental',
  crianca: 'direito-da-crianca-e-do-adolescente',
  internacional: 'direito-internacional',
  filosofia: 'filosofia-do-direito',
};

export function gerarLinkQConcursos(area: AreaOAB, numQuestoes = 10): string {
  const baseUrl = 'https://www.qconcursos.com/questoes-da-oab/questoes';
  const disciplina = DISCIPLINA_MAP[area.id] || area.id;
  return `${baseUrl}?discipline=${disciplina}&limit=${numQuestoes}`;
}

export type Dominio = 'baixo' | 'medio' | 'alto';
export type DiaSemana = 'seg' | 'ter' | 'qua' | 'qui' | 'sex' | 'sab' | 'dom';

export interface CronogramaInput {
  dataProva: string;
  horasPorDia: number;
  diasEstudo: DiaSemana[];
  dominioAreas: Record<string, Dominio>;
}

export interface AreaComHoras {
  area: AreaOAB;
  dominio: Dominio;
  pesoAjustado: number;
  horasAlocadas: number;
}

export interface SemanaCronograma {
  numero: number;
  dataInicio: Date;
  dataFim: Date;
  tipo: 'estudo' | 'revisao' | 'final';
  areas: AreaComHoras[];
  horasTotal: number;
  dicas: string[];
}

export interface ResultadoCronograma {
  diasDisponiveis: number;
  horasTotal: number;
  numSemanas: number;
  semanas: SemanaCronograma[];
  areasPrioritarias: AreaOAB[];
}

function shiftDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function dicasEstudo(area: AreaComHoras): string[] {
  const nome = area.area.nome;
  if (area.dominio === 'baixo') {
    return [
      `${nome}: área fraca — comece pela teoria esquematizada antes das questões.`,
      `Meta de ${area.area.questoesTipicas} questões por exame. Pratique progressivamente no QConcursos.`,
    ];
  }
  if (area.dominio === 'alto') {
    return [
      `${nome}: domínio bom — revisão rápida + questões de nível difícil.`,
      `${area.area.questoesTipicas} questões típicas por prova. Foco nos detalhes e exceções.`,
    ];
  }
  return [
    `${nome}: alterne 50% teoria e 50% questões por bloco de estudo.`,
    `${area.area.questoesTipicas} questões típicas por prova. Use o QConcursos para praticar.`,
  ];
}

const DICAS_REVISAO = [
  'Foco nas áreas com maior peso histórico.',
  'Resolva questões de provas anteriores da OAB.',
  'Revise os erros cometidos nas semanas de estudo.',
  'Não entre em matéria nova — só consolide o que já estudou.',
];

const DICAS_FINAL = [
  'Esta semana: revisão leve das áreas mais pesadas.',
  'Faça um simulado completo de 80 questões no QConcursos.',
  'Descanse pelo menos 2 dias antes da prova — o descanso é parte do plano.',
  'Revise o Estatuto da OAB e Ética: caem todo exame.',
];

export function calcularCronograma(input: CronogramaInput): ResultadoCronograma {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const prova = new Date(input.dataProva + 'T12:00:00');
  prova.setHours(0, 0, 0, 0);

  const diasDisponiveis = Math.max(7, Math.round((prova.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)));
  const diasPorSemana = Math.max(1, input.diasEstudo.length);
  const horasTotal = Math.round((diasDisponiveis / 7) * diasPorSemana * input.horasPorDia * 10) / 10;
  const numSemanas = Math.max(1, Math.ceil(diasDisponiveis / 7));

  const areasComPeso: AreaComHoras[] = AREAS_OAB_1FASE.map(area => {
    const dominio = input.dominioAreas[area.id] || 'medio';
    const mult = dominio === 'baixo' ? 1.5 : dominio === 'alto' ? 0.5 : 1.0;
    return { area, dominio, pesoAjustado: area.pesoHistorico * mult, horasAlocadas: 0 };
  });

  const somaPesos = areasComPeso.reduce((s, a) => s + a.pesoAjustado, 0);
  areasComPeso.forEach(a => {
    a.horasAlocadas = Math.round((a.pesoAjustado / somaPesos) * horasTotal * 10) / 10;
  });

  const areasOrdenadas = [...areasComPeso].sort((a, b) => b.horasAlocadas - a.horasAlocadas);
  const areasPrioritarias = areasOrdenadas.slice(0, 3).map(a => a.area);
  const horasPorSemana = diasPorSemana * input.horasPorDia;

  const semanas: SemanaCronograma[] = [];

  if (numSemanas <= 1) {
    semanas.push({
      numero: 1,
      dataInicio: new Date(hoje),
      dataFim: new Date(prova),
      tipo: 'final',
      areas: [],
      horasTotal,
      dicas: DICAS_FINAL,
    });
  } else if (numSemanas === 2) {
    semanas.push({
      numero: 1,
      dataInicio: new Date(hoje),
      dataFim: shiftDays(hoje, 6),
      tipo: 'estudo',
      areas: areasOrdenadas,
      horasTotal: horasPorSemana,
      dicas: areasOrdenadas.slice(0, 2).flatMap(dicasEstudo),
    });
    semanas.push({
      numero: 2,
      dataInicio: shiftDays(hoje, 7),
      dataFim: new Date(prova),
      tipo: 'final',
      areas: [],
      horasTotal: horasPorSemana,
      dicas: DICAS_FINAL,
    });
  } else {
    const numStudyWeeks = numSemanas - 2;
    const horasEstudo = horasTotal - 2 * horasPorSemana;
    const targetHorasPorSemanaEstudo = horasEstudo / numStudyWeeks;

    // Distribute areas across study weeks
    const weekGroups: AreaComHoras[][] = Array.from({ length: numStudyWeeks }, () => []);
    let wi = 0;
    let acum = 0;
    for (const area of areasOrdenadas) {
      weekGroups[wi].push(area);
      acum += area.horasAlocadas;
      if (acum >= targetHorasPorSemanaEstudo && wi < numStudyWeeks - 1) {
        wi++;
        acum = 0;
      }
    }

    let weekStart = new Date(hoje);
    for (let w = 0; w < numStudyWeeks; w++) {
      const grupo = weekGroups[w];
      semanas.push({
        numero: w + 1,
        dataInicio: new Date(weekStart),
        dataFim: shiftDays(weekStart, 6),
        tipo: 'estudo',
        areas: grupo,
        horasTotal: grupo.reduce((s, a) => s + a.horasAlocadas, 0),
        dicas: grupo.slice(0, 2).flatMap(dicasEstudo),
      });
      weekStart = shiftDays(weekStart, 7);
    }

    // Review week
    semanas.push({
      numero: numSemanas - 1,
      dataInicio: new Date(weekStart),
      dataFim: shiftDays(weekStart, 6),
      tipo: 'revisao',
      areas: areasOrdenadas.slice(0, 5),
      horasTotal: horasPorSemana,
      dicas: DICAS_REVISAO,
    });
    weekStart = shiftDays(weekStart, 7);

    // Final week
    semanas.push({
      numero: numSemanas,
      dataInicio: new Date(weekStart),
      dataFim: new Date(prova),
      tipo: 'final',
      areas: [],
      horasTotal: horasPorSemana,
      dicas: DICAS_FINAL,
    });
  }

  return { diasDisponiveis, horasTotal, numSemanas, semanas, areasPrioritarias };
}
