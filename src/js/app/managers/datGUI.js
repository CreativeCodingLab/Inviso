import Config from '../../data/config';

// Manages all dat.GUI interactions
export default class DatGUI {
  constructor(main) {
    const gui = new dat.GUI({ autoPlace: false });

    const guiContainer = document.getElementById('guis');
    guiContainer.appendChild(gui.domElement);

    gui.width = 250;
    gui.add(main, 'loadFile').name('Load Sound File');
    gui.add(main, 'attach').name('Attach Sound');
    gui.add(main, 'toggleAddTrajectory').name('Add Trajectory');
    gui.add(main, 'editObject').name('Edit Object');
  }
}
