# Inviso

A cross-platform tool for designing interactive virtual soundscapes. 

# TO-DO
• Code refactoring, adding a test framework

• Revising/implementing parametric view windows

• Constaining camera movement to bottom-right corner icons

• Switching between perspective and bird's-eye views should be tween'ed.

• Implementing state pause, play, save and load

• Omnidirectional sound source implementation for base spheres.

• In object edit view, the user-controlled objects in the scene besides the object that's being edited should be set to invisible (or removed from the scene) until exiting the object view mode.

• (Given that the above item is implemented) In object edit view the listener node, which is normally mapped to the head model, can (should?) be mapped to the camera. It is handed over to the head model upon leaving object edit view.


## GUI Details

• Back and forward scroll buttons (possibly next to object, cone name) to switch between objects, and also cones (for when an object, or a cone is hard to grab onto interactively)

• Interface for attaching omnidirectional Web Audio nodes to sound objects (textual elements in the object paramter window).

• Dialogue bubbles for Add Button ("Click anywhere on screen to create a sound object; click and drag for drawing sound zones"), and Camera Control ("Rotate the scene to change the height of a sound object or a trajectory point") UI elements.

• A dot that tracks the mouse cursor can be used between Add Button click and Scene click/click-and-drag events to make it clear that the user is in a state where they are adding objects or zones to the scene. Another possibility could be to highlight the floor plane  when user is in this state. Currently there is no indication of having hit the Add Button.

• ...

## Interaction bugs

• Navigation controls getting reversed after edit object state (possibly due to lookAt() flipping the y normal of the headModel –but not the model itself–); a possible fix could be ditching lookAt() and using a simpler rotate.y

• Object close-up view interactions need to be revisited: currently a toggle (select-unselect) behavior is implemented; this was mainly intended for the close-up view, which is currently phased out. Color and selection changes should happen with hover actions rather than click actions. 

• oMouseMove() and onMouseDown() functions is a mix of main and former object close-up view interactions. There should be unified interaction scheme. Currently, states like placingCone and isMousePressed are overlapping to a certain extent and should be simplified.

• Currently, if the zones are not drawn as convex hulls (i.e. if a point is dragged across a zone boundary) the shape utils fail to handle this, and ideally we want the zones to be only convex hulls. Shape Utils is throwing an exception when the the dragging across the boundary is attampted so we could use that to prevent the user from doing this (i.e. the dragged point stops moving when a boundary is hit).

• ...
