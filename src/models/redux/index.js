import { createStore, applyMiddleware, compose } from 'redux';
import rootReducer from './root';
import persistState from 'redux-localstorage';
import { createLogger } from 'redux-logger';
import persistSlicer from 'redux-localstorage-slicer';
import thunk from 'redux-thunk';
const logger = createLogger();


export default function configureStore(initialState) {

	const REDUX_LOCALSTORAGE_VERSION = 1;

	const createPersistentStore = compose(
			//let paths = ...
			//let config = ... 
			//persistState(paths, config)
			persistState(null, {
				slicer: persistSlicer(REDUX_LOCALSTORAGE_VERSION)
			}),
			//applyMiddleware(logger),
			applyMiddleware(thunk)
		)(createStore);

	const store = createPersistentStore(rootReducer, initialState);

	return store;
}
