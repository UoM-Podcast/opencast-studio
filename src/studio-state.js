//; -*- mode: rjsx;-*-
/** @jsx jsx */
import { jsx } from 'theme-ui';
import { createContext, useContext, useReducer } from 'react';
import { isDisplayCaptureSupported, isUserCaptureSupported } from './util';


export const MICROPHONE = 'microphone';
export const MICROPHONE_REQUEST = 'microphone_request';
export const NO_AUDIO = 'no-audio';
export const NONE = 'none';

export const STATE_NOT_UPLOADED = 'not_uploaded';
export const STATE_UPLOADING = 'uploading';
export const STATE_UPLOADED = 'uploaded';
export const STATE_ERROR = 'error';

// We use this global variable (scoped to this module) to save all metadata
// changes. We don't want to use state as that would lead to many useless
// rerenders.
const defaultMetaData = {
  title: '',
  presenter: '',
  email: '',
  series: { key: '-1', value: '' },
  visibility: {key: '-1', value: ''},
};
export let metaData = { ...defaultMetaData };


const initialState = () => ({
  audioAllowed: null,
  audioStream: null,
  audioSupported: isUserCaptureSupported(),

  displayAllowed: null,
  displayStream: null,
  displaySupported: isDisplayCaptureSupported(),

  userAllowed: null,
  userStream: null,
  userSupported: isUserCaptureSupported(),

  audioChoice: NONE,

  isRecording: false,

  recordings: [],

  upload: {
    error: null,
    state: STATE_NOT_UPLOADED,
  },
});

const reducer = (state, action) => {
  switch (action.type) {
    case 'CHOOSE_AUDIO':
      return { ...state, audioChoice: action.payload };

    case 'SHARE_AUDIO':
      return { ...state, audioStream: action.payload, audioAllowed: true };

    case 'BLOCK_AUDIO':
      return { ...state, audioStream: null, audioAllowed: false };

    case 'UNSHARE_AUDIO':
      return { ...state, audioStream: null };

    case 'SHARE_DISPLAY':
      return { ...state, displayStream: action.payload, displayAllowed: true };

    case 'BLOCK_DISPLAY':
      return { ...state, displayStream: null, displayAllowed: false };

    case 'UNSHARE_DISPLAY':
      return { ...state, displayStream: null };

    case 'SHARE_USER':
      return { ...state, userStream: action.payload, userAllowed: true };

    case 'BLOCK_USER':
      return { ...state, userStream: null, userAllowed: false };

    case 'UNSHARE_USER':
      return { ...state, userStream: null };

    case 'START_RECORDING':
      return { ...state, isRecording: true };

    case 'STOP_RECORDING':
      return { ...state, isRecording: false };

    case 'ADD_RECORDING':
      return { ...state, recordings: [...state.recordings, action.payload] };

    case 'UPLOAD_ERROR':
      return { ...state, upload: { ...state.upload, error: action.payload, state: STATE_ERROR } };

    case 'UPLOAD_FAILURE':
      return { ...state, upload: { ...state.upload, error: action.payload, state: STATE_ERROR } };

    case 'UPLOAD_REQUEST':
      return { ...state, upload: { ...state.upload, error: null, state: STATE_UPLOADING } };

    case 'UPLOAD_SUCCESS':
      return { ...state, upload: { ...state.upload, error: null, state: STATE_UPLOADED } };

    case 'MARK_DOWNLOADED':
      const mapped = state.recordings.map((recording, index) => (
        index === action.payload ? { ...recording, downloaded: true } : recording
      ));
      return { ...state, recordings: mapped };

    case 'RESET':
      metaData = { ...defaultMetaData };
      return initialState();

    default:
      throw new Error();
  }
};

const stateContext = createContext(null);
const dispatchContext = createContext(null);

export const Provider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState());

  return (
    <dispatchContext.Provider value={dispatch}>
      <stateContext.Provider value={state}>{children}</stateContext.Provider>
    </dispatchContext.Provider>
  );
};

export const useDispatch = () => useContext(dispatchContext);

export const useStudioState = (property = null) => {
  const state = useContext(stateContext);
  return property !== null ? state[property] : state;
};
