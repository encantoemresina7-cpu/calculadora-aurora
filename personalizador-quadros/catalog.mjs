// Original files stay available; editable bases separate the artwork from customer text.
const folder = 'assets/kits/';
const make = (id, title, kit, extra = {}) => ({
  id, title, kit, url: folder + id + '-original.webp',
  thumb: folder + id + '-thumb.webp', removePaper: true, ...extra,
});
export const KITS = [
  {id:'fazendeiro',title:'Kit Fazendeiro',icon:'🚜',color:'#73865c',pattern:'watercolor',defaults:['fazendeiro-celeiro','fazendeiro-inicial','fazendeiro-feno']},
  {id:'dinossauro',title:'Kit Dinossauro',icon:'🦕',color:'#76916b',pattern:'spots',defaults:['dinossauro-verde','dinossauro-inicial','dinossauro-azul']},
  {id:'astronauta',title:'Kit Astronauta',icon:'🚀',color:'#5f89ae',pattern:'stars',defaults:['astronauta-foguete','astronauta-inicial','astronauta-planeta']},
  {id:'safari',title:'Kit Safari',icon:'🦁',color:'#799267',pattern:'watercolor',defaults:['safari-leao','safari-amigos','safari-jipe']},
  {id:'bosque',title:'Bosque encantado',icon:'🌿',color:'#718452',pattern:'watercolor',single:true,defaults:['bosque-amigos','bosque-bento','bosque-amigos']},
  {id:'marinheiro',title:'Kit Marinheiro',icon:'⛵',color:'#6f99b6',pattern:'stripes',defaults:['marinheiro-baleia','marinheiro-inicial','marinheiro-veleiro']},
  {id:'classicos',title:'Outros temas',icon:'✿',color:'#987180',pattern:'watercolor',defaults:['bailarina','sereia','cavalinho']},
];
export const BUILTINS = [
  make('fazendeiro-menino','Menino fazendeiro','fazendeiro'),
  make('fazendeiro-trator','Trator vintage','fazendeiro'),
  make('fazendeiro-trator-lado','Trator de lado','fazendeiro'),
  make('fazendeiro-celeiro','Celeiro e trator','fazendeiro'),
  make('fazendeiro-inicial','Inicial da fazendinha','fazendeiro',{url:folder+'fazendeiro-inicial-base.webp',monogram:true,hasName:true}),
  make('fazendeiro-feno','Trator com feno','fazendeiro'),
  make('dinossauro-verde','Dinossauro verde','dinossauro'),
  make('dinossauro-inicial','Inicial dinossauro','dinossauro',{url:folder+'dinossauro-inicial-base.webp',monogram:true,hasName:true}),
  make('dinossauro-azul','Tricerátopo azul','dinossauro'),
  make('astronauta-foguete','Foguete','astronauta'),
  make('astronauta-inicial','Inicial e astronauta','astronauta',{url:folder+'astronauta-inicial-base.webp',monogram:true,hasName:true}),
  make('astronauta-planeta','Planeta com anéis','astronauta'),
  make('safari-amigos','Amigos do safari','safari',{url:folder+'safari-amigos-base.webp',hasName:true}),
  make('safari-leao','Leão no carrinho','safari'),
  make('safari-jipe','Jipe do safari','safari',{url:folder+'safari-jipe-base.webp',hasName:true,embeddedName:true,paperSeeds:[[.5,.9]],nameY:.64}),
  make('bosque-bento','Bosque com nome','bosque',{url:folder+'bosque-amigos-original.webp',hasName:true}),
  make('bosque-amigos','Amigos do bosque','bosque'),
  make('marinheiro-baleia','Baleia','marinheiro'),
  make('marinheiro-inicial','Inicial marinheiro','marinheiro',{url:folder+'marinheiro-inicial-base.webp',monogram:true,hasName:true}),
  make('marinheiro-veleiro','Veleiro','marinheiro'),
  ...['bailarina','sereia','passarinho','cavalinho'].map(id=>({id,title:{bailarina:'Bailarina',sereia:'Sereia',passarinho:'Passarinho',cavalinho:'Cavalinho'}[id],kit:'classicos',url:'assets/'+id+'.png',removePaper:true,hasName:true})),
];
export function initialFromName(name) {
  return Array.from(String(name || '').trim().normalize('NFC'))[0]?.toLocaleUpperCase('pt-BR') || '';
}
