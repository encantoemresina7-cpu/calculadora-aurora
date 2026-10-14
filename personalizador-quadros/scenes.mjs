export const SCENES = [
  {id:'claro',title:'Quarto claro com berço',url:'assets/scenes/quarto-claro.webp'},
  {id:'azul',title:'Quarto azul',url:'assets/scenes/quarto-azul.webp'},
  {id:'rosa',title:'Quarto rosa',url:'assets/scenes/quarto-rosa.webp'},
  {id:'wall',title:'Parede lisa · escolher a cor'},
];

export const sceneById = id => SCENES.find(scene=>scene.id===id)||SCENES[0];

// All room photos leave this wall area free of furniture.
export function roomPictureArea(w,h) {
  return {x:w*.12,y:h*.12,width:w*.76,height:h*.46};
}
