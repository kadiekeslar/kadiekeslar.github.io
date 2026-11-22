wrdly app specification

app overview

my app is called wrdly and it is a word guessing game that is similar to wordle, the main difference is that you can choose how many letters you want in your word and you can play as many times as you want instead of only once a day, i wanted to make this because i like wordle but i think it would be more fun if you could play whenever you wanted and change the difficulty

screens

home screen

the home screen will have the name wrdly at the top and a simple design, there will be options to choose between 4, 5, 6, 7, or 8 letter words, once the player chooses how many letters they want they can press play to start the game, i also want the home screen to show how many games they have played and how many they have won

game screen

the game screen will have a grid similar to wordle with 6 rows and however many columns the player chose, there will be a keyboard at the bottom of the screen that the player can use to guess letters, after each guess the letters will change colors, green means the letter is in the correct spot, yellow means the letter is in the word but in a different spot, and gray means the letter is not in the word, the player will have 6 tries to guess the word

game features

the player can choose between 4 and 8 letter words, all words will be in english and there will not be an option to change languages, the game will randomly choose a word based on the length the player selected, the player should only be able to submit real english words, if the word is not valid the game should tell them and let them try again without using one of their guesses

if the player guesses the word correctly the game will tell them they won, if they use all 6 guesses without getting the word the game will tell them they lost and show the correct word, after either result they can choose to play again or go back to the home screen

the player should be able to play as many games as they want each day, there should not be a daily limit, when they start a new game the app should choose another random word

saved data

i want the app to save how many games the player has played and how many games they have won, this information should still be there after they close the app and open it again, i want to use local storage so the player does not need to make an account

design

i want the app to have a dark background with green as the main color, the design should be pretty simple and easy to use, the buttons should be easy to press and the words should be easy to read, i want it to look good on a phone and not have too much going on

acceptance criteria

1, when the app opens the player should see the home screen with the name wrdly

2, the player should be able to choose between 4, 5, 6, 7, and 8 letter words

3, pressing play should open the game screen with the correct number of columns

4, the player should be able to enter letters using the keyboard and delete letters before submitting

5, the player should only be able to submit guesses that have the correct number of letters and are real english words

6, after submitting a valid guess the letters should change to green yellow or gray depending on how they match the answer, repeated letters should be handled correctly

7, the player should have 6 chances to guess the correct word

8, when the player guesses correctly the game should show a winning message

9, when the player runs out of guesses the game should show a losing message and reveal the correct word

10, after finishing a game the player should be able to start another game without waiting until the next day

11, the player should be able to return to the home screen from the game screen

12, the app should keep track of total games played and total games won

13, when the player closes and reopens the app their statistics should still be saved

14, the game should only use english words and should not have any language settings

15, the app should work on my phone using expo go