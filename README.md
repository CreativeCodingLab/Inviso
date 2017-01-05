# Inviso

A cross-platform tool for designing interactive virtual soundscapes. 

# TO-DO
• Code refactoring, adding a test framework

• Revising/implementing parametric view windows

• Constaining camera movement to bottom-right corner icons

• Switching between perspective and bird's-eye views should be tween'ed.

• Implementing state pause, play, save and load

• Omnidirectional sound source implementation for base spheres, and the interface for attaching these to sound objects.


## GUI Details

• Back and forward scroll buttons (possibly next to object, cone name) to switch between objects, and also cones (for when an object, or a cone is hard to grab onto interactively)

• ...

## Interaction bugs

• Navigation controls getting reversed after edit object state (possibly due to lookAt() flipping the y normal of the headModel –but not the model itself–); a possible fix could be ditching lookAt() and using a simpler rotate.y

• Object close-up view interactions need to be revisited: currently a toggle (select-unselect) behavior is implemented; this was mainly intended for the close-up view, which is currently phased out. Color and selection changes should happen with hover actions rather than click actions. 

• oMouseMove() and onMouseDown() functions is a mix of main and former object close-up view interactions. There should be unified interaction scheme. Currently, states like placingCone and isMousePressed are overlapping to a certain extent and should be simplified.

• ...
