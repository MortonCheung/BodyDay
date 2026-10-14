import { useGLTF } from '@react-three/drei';

export const MODELS = {
  bed: '/models/bedSingle.glb',
  desk: '/models/desk.glb',
  chair: '/models/chairDesk.glb',
  keyboard: '/models/computerKeyboard.glb',
  mouse: '/models/computerMouse.glb',
  laptop: '/models/laptop.glb',
  lampTable: '/models/lampSquareTable.glb',
  books: '/models/books.glb',
  bookcase: '/models/bookcaseOpen.glb',
  plantBig: '/models/pottedPlant.glb',
  plant1: '/models/plantSmall1.glb',
  plant2: '/models/plantSmall2.glb',
  rugRect: '/models/rugRectangle.glb',
  rugMat: '/models/rugDoormat.glb',
  trash: '/models/trashcan.glb',
  sideTable: '/models/sideTableDrawers.glb',
  coatRack: '/models/coatRackStanding.glb',
  box: '/models/cardboardBoxClosed.glb',
  stool: '/models/stoolBarSquare.glb',
} as const;

export function preloadModels() {
  Object.values(MODELS).forEach((url) => useGLTF.preload(url));
}
