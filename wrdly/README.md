# wrdly

## what my app does

wrdly is a mobile word guessing game that is similar to wordle, except players can choose between 4 and 8 letter words and play as many games as they want instead of being limited to one game a day, the app only uses english words and keeps track of how many games the player has played and won

## why i chose this idea

i recently had a coding assessment where i had to create the front end of a wordle interface without using ai, after doing that i wanted to see what it would be like to build a similar game using ai and how much it would change my workflow, i thought it would be interesting to compare the experience of building something on my own versus working with codex to create a full mobile app

## app screens

### home screen

the home screen shows the name wrdly and lets the player choose how many letters they want in their word, there are options for 4, 5, 6, 7, and 8 letter words, the player can press play to start a game, the home screen also shows the total number of games played and won

### game screen

the game screen has a grid with 6 rows and the number of columns depends on the word length selected, players use the keyboard to type their guesses and press enter to submit them, after each guess the letters flip over and turn green yellow or gray depending on whether they are correct, players have 6 tries to guess the word and can start a new game or go back to the home screen when they finish

## how to run the app

the app was built using react native and expo with expo router for navigation, it uses asyncstorage to save game statistics on the phone

the project uses expo sdk 58

to run the app locally

1. clone the github repository
2. open the wrdly project folder in terminal
3. run `npm install`
4. run `npx expo start`
5. open expo go on your phone and scan the qr code

i tested the app using expo go on my phone

## something i learned

one thing that surprised me about mobile development was how easy it was to test changes directly on my phone using expo go, i could make changes to the code and see them on my phone without having to rebuild the entire app each time, i also learned that even when ai generates most of the code there is still a lot of testing and debugging involved, especially when something works in the code but does not actually behave correctly on the phone

## using ai

i used codex to help build the app based on my spec file, after the first version was finished i tested it on my phone and found a few bugs, including the letter i not appearing when pressed and some problems with the keyboard, i also wanted to improve the animations so the tiles would flip one at a time like wordle

after fixing those issues i had a separate codex session review the code against my spec, then i went back and fixed the problems it found, this helped me see how ai can speed up development but also why it is important to test everything yourself

## project files

- `SPEC.md` contains my original plan for the app
- `review.md` contains the independent ai review
- `prompt_log.md` contains the prompts i used with codex
- `src` contains the app screens and game logic

## future improvements

if i kept working on wrdly i would probably add more statistics like win streaks and average guesses, i would also want to add more animations and maybe different game modes
