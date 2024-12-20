# Architecture

## Repository Architecture

The core of the codebase is in the packages directory, which is made up of the frontend directory and the backend directory. We use React for the front end and Express for the backend.

### React Frontend
The core of the frontend is in the src directory. This directory has our top level app along with three other directories: pages, components, and utils.
Pages strictly contains react components that make up each page on the navbar. The components directory is the place for components used on multiple spots throughout the app, such as the Navbar, Time Range Selector, Loading Spinner, List Items, etc. Technically speaking, not all of the components in this directory are used more than once, but they are designed in a way where they could be easily imported into any and all files if needed. Finally the utils page is the place for functions. The files in this directory are purely Javascript files. 


### Express Backend
Our express-backend directory, at the top level, contains the base backend.js file and a genres.json file. Genres.json contains keys of all the main genres on Spotify along with an array of all of the subgenres that fall under that main genre's category. This JSON file is used to calculate genre proportions for the user. The backend.js file is the main essence of the backend with our routes and setup. In the top level directory, there are two sub directories: models and utils. Models stores the MongoDB collection models, including UserAlbums, UserArtists, UserData, UserGenreCounts, and UserTracks. Utils stores utility functions for the main backend, including mongoUtils.js which contain utility functions for interacting with the MongoDB database and spotifyUtils.js which contain utility functions for interacting with the Spotify Developer API.

## Database Architecture

A main UserData collection holds the primary information of a user, including their Spotify ID, which is used to link a user to their data when they log in. Each document in this collection also holds a last_updated field, which holds the date and time at which the database was last updated with new Spotify API calls for that user. Upon login, the app references this date to determine whether or not to use the current data in the database or to make new calls using the Spotify API and update the database with the newly retrieved data.

Albums, Artists, and Tracks are all directly retrieved from the Spotify API.

The following UML represents our database structure:

![307UML](https://github.com/user-attachments/assets/b73467ae-4ffc-4f58-985d-2635abaa1940)
