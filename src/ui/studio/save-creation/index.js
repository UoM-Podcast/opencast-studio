//; -*- mode: rjsx;-*-
/** @jsx jsx */
import { jsx, Styled, Progress } from 'theme-ui';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faUpload, faRedoAlt } from '@fortawesome/free-solid-svg-icons';
import { Button, Box, Container, Spinner, Text } from '@theme-ui/components';
import React, { useEffect, useState, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';

import { useOpencast, STATE_INCORRECT_LOGIN } from '../../../opencast';
import { useSettings } from '../../../settings';
import {
  metaData,
  useDispatch,
  useStudioState,
  STATE_ERROR,
  STATE_UPLOADING,
  STATE_UPLOADED,
  STATE_NOT_UPLOADED,
} from '../../../studio-state';

import Notification from '../../notification';
import {  } from '../page';
import { ActionButtons } from '../elements';

import FormField from './form-field';
import RecordingPreview from './recording-preview';

import { getIngestInfo, isCourseId } from '../../../manchester';

const LAST_PRESENTER_KEY = 'lastPresenter';

const Input = props => <input sx={{ variant: 'styles.input' }} {...props} />;

export default function SaveCreation(props) {
  const settings = useSettings();
  const { t } = useTranslation();
  const opencast = useOpencast();
  const { recordings, upload: uploadState } = useStudioState();
  const dispatch = useDispatch();

  function handleBack() {
    props.previousStep();
  }

  const progressHistory = useRef([]);
  const [secondsLeft, setSecondsLeft] = useState(null);
  const [currentProgress, setCurrentProgress] = useState(0);
  function onProgress(progress) {
    setCurrentProgress(progress);

    // ----- Time estimation -----
    // We use a simple sliding average over the last few data points and assume
    // that speed for the rest of the upload.

    const now = Date.now();

    // Add progress data point to history.
    progressHistory.current.push({
      timestamp: now,
      progress,
    });

    // The size of the sliding window in milliseconds.
    const WINDOW_SIZE_MS = 5000;
    // The size of the sliding window in number of data points.
    const WINDOW_SIZE_DATA_POINTS = 6;
    // The number of datapoints below which we won't show a time estimate.
    const MINIMUM_DATA_POINT_COUNT = 4;

    // Find the first element within the window. We use the larger window of the
    // two windows created by the two constraints (time and number of
    // datapoints).
    const windowStart = Math.min(
      progressHistory.current.findIndex(p => (now - p.timestamp) < WINDOW_SIZE_MS),
      Math.max(0, progressHistory.current.length - WINDOW_SIZE_DATA_POINTS),
    );

    // Remove all elements outside the window.
    progressHistory.current.splice(0, windowStart);
    const win = progressHistory.current;

    if (win.length >= MINIMUM_DATA_POINT_COUNT) {
      // Calculate the remaining time based on the average speed within the window.
      const windowLength = now - win[0].timestamp;
      const progressInWindow = progress - win[0].progress;
      const progressPerSecond = (progressInWindow / windowLength) * 1000;
      const progressLeft = 1 - progress;
      const secondsLeft = Math.max(0, Math.round(progressLeft / progressPerSecond));

      setSecondsLeft(secondsLeft);
    }
  }

  useEffect(() => {
    // To still update the time estimation, we make sure to call `onProgress` at
    // least every so often.
    const interval = setInterval(() => {
      if (uploadState.state !== STATE_UPLOADING) {
        return;
      }

      const lastProgress = progressHistory.current[progressHistory.current.length - 1];
      const timeSinceLastUpdate = Date.now() - lastProgress.timestamp;
      if (timeSinceLastUpdate > 3000) {
        onProgress(lastProgress.progress)
      }
    }, 1000);

    return () => clearInterval(interval);
  });

  async function handleUpload() {
    const { title, presenter, email, series, visibility } = metaData;

    console.debug('Metadata: ', metaData);

    if (title === '' || presenter === '' || series.key === '-1' || email === '') {
      dispatch({ type: 'UPLOAD_ERROR', payload: t('save-creation-form-invalid') });
      return;
    }

    // Store the presenter name in local storage
    window.localStorage.setItem(LAST_PRESENTER_KEY, presenter);

    dispatch({ type: 'UPLOAD_REQUEST' });

    settings.upload.email = email;
    settings.upload.visibility = visibility.key;

    if(settings.upload?.ingestInfoUrl) {
      const result = await getIngestInfo(settings.upload.ingestInfoUrl, metaData);
      console.debug('Ingest Info', result);
      settings.upload.seriesId = result.series.seriesId;
      settings.upload.source = result.series.source;
      settings.upload.wf_properties = result.wf_properties;
      settings.upload.audience = result.audience;
    }

    progressHistory.current.push({
      timestamp: Date.now(),
      progress: 0,
    });
    const success = await opencast.upload({
      recordings: recordings.filter(Boolean),
      title,
      creator: presenter,
      uploadSettings: settings.upload,
      onProgress,
    });

    if (success) {
      dispatch({ type: 'UPLOAD_SUCCESS' });
    } else {
      switch (opencast.getState()) {
        case STATE_INCORRECT_LOGIN:
          dispatch({ type: 'UPLOAD_FAILURE', payload: t('message-login-failed') });
          break;
        default:
          // TODO: this needs a better message and maybe some special cases.
          dispatch({ type: 'UPLOAD_FAILURE', payload: t('message-server-unreachable') });
          break;
      }
    }
  }

  const handleNewRecording = () => {
    const doIt = window.confirm(t('save-creation-new-recording-warning'));
    if (doIt) {
      dispatch({ type: 'RESET' });
      props.firstStep();
    }
  };

  const allDownloaded = recordings.every(rec => rec.downloaded);
  const possiblyDone = uploadState.state === STATE_UPLOADED || allDownloaded;

  // Depending on the state, show a different thing in the upload box.
  const uploadBox = (() => {
    if (!opencast.isReadyToUpload() && uploadState.state === STATE_NOT_UPLOADED) {
      return <ConnectionUnconfiguredWarning />;
    }

    switch (uploadState.state) {
      case STATE_UPLOADING:
        return <UploadProgress {...{ currentProgress, secondsLeft }} />;
      case STATE_UPLOADED:
        return <UploadSuccess />;
      default: // STATE_NOT_UPLOADED or STATE_ERROR
        return <UploadForm {...{ opencast, uploadState, recordings, handleUpload }} />
    }
  })();

  return (
    <Container sx={{ display: 'flex', flexDirection: 'column', flex: '1 0 auto' }}>
      <Styled.h1 sx={{ textAlign: 'center', fontSize: ['26px', '30px', '32px'] }}>
        { possiblyDone ? t('save-creation-title-done') : t('save-creation-title') }
      </Styled.h1>

      <div sx={{
        display: 'flex',
        flexDirection: ['column', 'column', 'row'],
        '& > *': {
          flex: '1 0 50%',
          p: [2, 2, '0 32px'],
          '&:last-child': {
            borderLeft: ['none', 'none', theme => `1px solid ${theme.colors.gray[3]}`],
          },
        },
      }}>
        <div>
          <Styled.h2
            sx={{ pb: 1, borderBottom: theme => `1px solid ${theme.colors.gray[2]}` }}
          >{t('save-creation-subsection-title-upload')}</Styled.h2>

          <div sx={{ margin: 'auto' }}>
            { uploadBox }
          </div>
        </div>

        <div>
          <Styled.h2
            sx={{ pb: 1, borderBottom: theme => `1px solid ${theme.colors.gray[2]}` }}
          >{t('save-creation-subsection-title-download')}</Styled.h2>

          <DownloadBox recordings={recordings} dispatch={dispatch} />
        </div>
      </div>

      <div sx={{ flex: '1 0 40px' }}></div>

      <ActionButtons
        next={null}
        prev={possiblyDone ? null : {
          onClick: handleBack,
          disabled: false,
        }}
      >
        { !possiblyDone ? null : (
          <Button
            sx={{ whiteSpace: 'nowrap' }}
            onClick={handleNewRecording}
          >
            <FontAwesomeIcon icon={faRedoAlt} />
            {t('save-creation-new-recording')}
          </Button>
        )}
      </ActionButtons>
    </Container>
  );
}

const DownloadBox = ({ recordings, dispatch }) => (
  <div sx={{
    display: 'flex',
    flexDirection: 'row',
    justifyContent: ['center', 'center', 'start'],
    flexWrap: 'wrap',
  }}>
    {recordings.length === 0 ? <Spinner /> : (
      recordings.map((recording, index) => (
        <RecordingPreview
          key={index}
          deviceType={recording.deviceType}
          mimeType={recording.mimeType}
          url={recording.url}
          downloaded={recording.downloaded}
          onDownload={() => dispatch({ type: 'MARK_DOWNLOADED', payload: index })}
        />
      ))
    )}
  </div>
);

// Shown if there is no working Opencast connection. Shows a warning and a link
// to settings.
const ConnectionUnconfiguredWarning = () => {
  const location = useLocation();

  return (
    <Notification key="opencast-connection" isDanger>
      <Trans i18nKey="warning-missing-connection-settings">
        Warning.
        <Link
          to={{ pathname: "/settings", search: location.search }}
          sx={{ variant: 'styles.a', color: '#ff2' }}
        >
          settings
        </Link>
      </Trans>
    </Notification>
  );
}

const UploadForm = ({ opencast, uploadState, recordings, handleUpload }) => {
  const { t } = useTranslation();
  const settings = useSettings();

  metaData.presenter = settings.user?.name;
  metaData.email = settings.user?.email;

  function handleInputChange(event) {
    const target = event.target;
    let value = target.value;
    if (target.tagName === 'SELECT') {
      value = {
        key: target.value,
        value: target.options[target.selectedIndex].text,
      }
    }
    metaData[target.name] = value;

    if (target.name === 'series') {
      const isCourse = isCourseId(target.value);
      const visibility = document.getElementsByName('visibility')[0];
      if (isCourse) {
        visibility.value = '2';
        metaData['visibility'] = {
          key: visibility.value, 
          value: visibility.options[visibility.selectedIndex].text
        };
      }
      visibility.disabled = isCourse;
    }
  }

  // If the user has not yet changed the value of the field and the last used
  // presenter name is used in local storage, use that.
  const presenterValue
    = metaData.presenter || window.localStorage.getItem(LAST_PRESENTER_KEY) || '';

  const buttonLabel = !opencast.prettyServerUrl()
    ? t('save-creation-button-upload')
    : (
      <Trans i18nKey="save-creation-upload-to">
        Upload to <code sx={{
          backgroundColor: 'rgba(0, 0, 0, 0.1)',
          borderRadius: '5px',
          padding: '1px 3px',
        }}>{{server: opencast.prettyServerUrl()}}</code>
      </Trans>
    );

  return (
    <React.Fragment>
      <FormField label={t('save-creation-label-title')}>
        <Input
          name="title"
          autoComplete="off"
          defaultValue={metaData.title}
          onChange={handleInputChange}
        />
      </FormField>

      <FormField label={t('save-creation-label-presenter')}>
        <Input
          name="presenter"
          autoComplete="off"
          defaultValue={presenterValue}
          onChange={handleInputChange}
        />
      </FormField>

      <FormField label={t('save-creation-label-email')}>
          <Input
            name="email"
            autoComplete="off"
            defaultValue={metaData.email}
            onChange={handleInputChange}
            type="email"
          />
        </FormField>

        <FormField label={t('save-creation-label-series')}>
          <select
            sx={{ variant: 'styles.select' }}
            name="series"
            defaultValue={metaData.series.id}
            onChange={handleInputChange}
          >
            <option value="-1">Please select...</option>
            {settings.seriesList?.map(series => (
              <option value={series.id} key={series.id}>
                {series.title}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label={t('save-creation-label-visibility')}>
          <select
            sx={{ variant: 'styles.select' }}
            name="visibility"
            defaultValue={metaData.visibility.id}
            onChange={handleInputChange}
          >
            <option value="-1">Please select...</option>
            {settings.visibilityList.map(visibility => (
              <option value={visibility.id} key={visibility.id}>
                {visibility.name}
              </option>
            ))}
          </select>
        </FormField>

      <Button onClick={handleUpload} disabled={recordings.length === 0}>
        <FontAwesomeIcon icon={faUpload} />
        { buttonLabel }
      </Button>

      <Box sx={{ mt: 2 }}>
        { uploadState.state === STATE_ERROR && (
          <Notification isDanger>{uploadState.error}</Notification>
        )}
      </Box>
    </React.Fragment>
  );
}

// Shown during upload. Shows a progressbar, the percentage of data already
// uploaded and `secondsLeft` nicely formatted as human readable time.
const UploadProgress = ({ currentProgress, secondsLeft }) => {
  const { t } = useTranslation();

  // Progress as percent with one fractional digit, e.g. 27.3%.
  const roundedPercent = Math.min(100, currentProgress * 100).toFixed(1);

  // Nicely format the remaining time.
  let prettyTime;
  if (secondsLeft === null) {
    prettyTime = null;
  } else if (secondsLeft < 4) {
    prettyTime = t('upload-time-a-few-seconds');
  } else if (secondsLeft < 45) {
    prettyTime = `${secondsLeft} ${t('upload-time-seconds')}`;
  } else if (secondsLeft < 90) {
    prettyTime = t('upload-time-a-minute');
  } else if (secondsLeft < 45 * 60) {
    prettyTime = `${Math.round(secondsLeft / 60)} ${t('upload-time-minutes')}`
  } else if (secondsLeft < 90 * 60) {
    prettyTime = t('upload-time-an-hour');
  } else if (secondsLeft < 24 * 60 * 60) {
    prettyTime = `${Math.round(secondsLeft / (60 * 60))} ${t('upload-time-hours')}`
  } else {
    prettyTime = null;
  }

  return (
    <React.Fragment>
      <div sx={{ display: 'flex', mb: 2 }}>
        <Text variant='text'>{roundedPercent}%</Text>
        <div sx={{ flex: 1 }} />
        <Text variant='text'>
          {prettyTime && <Trans i18nKey="upload-time-left">
            {{ time: prettyTime }} left
          </Trans>}
        </Text>
      </div>
      <Progress max={1} value={currentProgress} variant='styles.progress'>
        { roundedPercent }
      </Progress>
      <Text variant='text' sx={{ textAlign: 'center', mt: 2 }}>{t('upload-notification')}</Text>
    </React.Fragment>
  );
}

// Shown if the upload was successful. A big green checkmark and a text.
const UploadSuccess = () => {
  const { t } = useTranslation();

  return (
    <React.Fragment>
      <div sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '130px',
        color: 'primary',
      }}>
        <FontAwesomeIcon icon={faCheckCircle} size="4x" />
      </div>
      <Text variant='text' sx={{ textAlign: 'center' }}>{t('message-upload-complete')}</Text>
      <Text sx={{ textAlign: 'center', mt: 2 }}>{t('message-upload-complete-explanation')}</Text>
    </React.Fragment>
  );
}
