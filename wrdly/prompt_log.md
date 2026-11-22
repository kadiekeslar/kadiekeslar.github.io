## initial prompt

i want you to help me build my mobile app called wrdly, i already made my spec file so please read spec.md first and use that to build the app

the app is going to be similar to wordle but i want people to be able to choose how many letters are in the word and play as many times as they want each day, i want it to only use english words and i do not want any other language options

i want the home screen to have the name wrdly and let players choose between 4 and 8 letter words, then they can press play and go to the game screen, the game should have 6 guesses and a keyboard like wordle, the letters should change colors after each guess depending on if they are correct or not

i also want the app to keep track of how many games someone has played and how many they have won, this should still be saved even if they close the app and open it again

i want the design to be pretty simple with a dark background and green colors, make sure everything fits on a phone screen and is easy to use

please use the expo project that i already created and make sure the code works with the expo version i have, you can create whatever files are needed and install any packages that are needed, but try to keep the code simple and not make it more complicated than it needs to be

please build the whole app based on my spec and check for errors when you are done, then explain what you changed and how i can test it on my phone using expo go

do not change my spec file or make the review file yet because i will do that part later


## after i tested and found bugs 

i tested wrdly on my phone and noticed a few things that i want to fix

first i noticed that the game lets me enter the same word more than once, i want it to remember the words that have already been guessed in the current game and not let someone submit the same word twice, if they try to guess the same word again it should tell them they already used that word and not take away one of their guesses

second the letter i is not showing up on the keyboard, please figure out why and make sure all 26 letters are visible and working, i also want the keyboard to fit on the screen without any letters getting cut off

third i want the letters to have an animation when someone presses enter just like wordle, instead of all the colors appearing at once i want each tile to flip over one at a time from left to right and reveal its color, the animation should be smooth and not too fast, i also want the keyboard colors to update after the animation finishes

please make sure the player cannot type or submit another guess while the animation is playing, after the animation ends they should be able to continue playing normally

i want you to keep the rest of the game the same and only change what is needed to fix these problems, please use animations that work with expo go and do not add anything too complicated

when you are done please check for errors and explain what you changed so i can test it again on my phone

## still some bugs infixed

the animation is working now but there is still a problem with the letter i on the keyboard

i can see the letter i on the keyboard and press it but when i press it nothing shows up in the guessing grid, all the other letters seem to work normally

please look through the code that handles the keyboard input and figure out why the letter i is not being added to the current guess, check if the problem is with the keyboard button or how the letter is being displayed in the grid

i want the letter i to work exactly like every other letter, it should appear in the next empty tile when i press it and i should be able to delete it or submit it as part of a word

please fix this without changing the animation or anything else that is already working, keep the changes as small as possible

when you are done please check that all 26 letters work correctly and explain what was causing the problem


## agent review


i finished building my wrdly app and now i need you to review it based on my spec file

please read spec.md and go through all the code to make sure everything works the way i wanted it to

i want you to check each acceptance criterion and say if it passes or fails or if there is something that might be a problem

also check for bugs, missing features, problems with saving statistics, and anything that might cause the app to crash

please include the file names and line numbers when you find something wrong

i want you to create a file called review.md with all of your findings, but do not fix anything or change any of my code yet

please keep the review separate from the building process and be honest about anything that might not work

## fixing errors found in review

i finished the independent review of wrdly and now i want to fix the problems that were found

please read my spec file and review file before making any changes

the first problem is that if the saved statistics get corrupted the app can get stuck on an error screen and the player cannot get back into the game, please fix this so the app can recover and still be used

the second problem is that if saving statistics fails and someone goes back to the home screen their game result can be lost, please make sure completed games and wins are saved correctly and that a failed save can be retried even if the player leaves the game screen

the third problem is that changing the word length while the game screen is still open can cause the grid and answer to have different lengths, please fix this so the word length and answer always match

the review also mentioned that the keyboard buttons might be too small on some phones, please check the keyboard layout and make sure all the letters are easy to press and nothing gets cut off, especially the letter i since we had problems with it earlier

please keep the rest of the game the same because i am happy with how it looks and plays right now, i do not want you to change the animations or add new features

please keep the fixes as simple as possible and make sure they work with expo go

when you are done please run the tests and check for errors, also explain what you changed so i can test the fixes on my phone

do not change my spec file or review file because i need to keep the original review for my assignment

after you finish fixing everything please check the git status and make sure you are working in the correct wrdly project inside my desktop 15113 folder

then commit the changes with the message fixes after AI review and push them to my existing github repository

please do not create a new repository or change branches and tell me if the commit and push were successful