# Inviso

A cross-platform tool for designing interactive virtual soundscapes. 

# TO-DO
• Code refactoring, adding a test framework

• Revising/implementing parametric view windows

• Constaining camera movement to bottom-left corner icons

• Implementing state pause, play, save and load


## GUI Details

• Back and forward scroll buttons (possibly next to object, cone name) to switch between objects, and also cones (for when an object, or a cone is hard to grab onto interactively)
• ...

## Interaction bugs

• Navigation controls getting reversed after edit object state (possibly due to lookAt() flipping the y normal of the headModel –but not the model itself–); a possible fix could be ditching lookAt() and using a simpler rotate.y
• ...
