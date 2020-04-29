//; -*- mode: rjsx;-*-
/** @jsx jsx */
import { jsx, Styled, Progress } from 'theme-ui';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faUpload, faRedoAlt } from '@fortawesome/free-solid-svg-icons';
import { Button, Box, Container, Spinner, Text } from '@theme-ui/components';
import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';

import { useOpencast, STATE_INCORRECT_LOGIN } from '../../../opencast';
import { useSettings } from '../../../settings';
import {
  useDispatch,
  useStudioState,
  STATE_ERROR,
  STATE_UPLOADING,
  STATE_UPLOADED,
  STATE_NOT_UPLOADED,
} from '../../../studio-state';

import Notification from '../../notification';
import { ActionButtons } from '../elements';

import FormField from './form-field';
import RecordingPreview from './recording-preview';

import { getIngestInfo, isCourseId } from '../../../manchester';

const LAST_PRESENTER_KEY = 'lastPresenter';

const Input = props => <input sx={{ variant: 'styles.input' }} {...props} />;

let progressHistory = [];

export default function SaveCreation(props) {
  const settings = useSettings();
  const { t } = useTranslation();
  const opencast = useOpencast();
  const { recordings, upload: uploadState, title, presenter, email, series, visibility, edit } = useStudioState();
  const dispatch = useDispatch();

  function handleBack() {
    props.previousStep();
  }

  function onProgress(progress) {
    // ----- Time estimation -----
    // We use a simple sliding average over the last few data points and assume
    // that speed for the rest of the upload.
    const now = Date.now();

    // Add progress data point to history.
    progressHistory.push({
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
      progressHistory.findIndex(p => (now - p.timestamp) < WINDOW_SIZE_MS),
      Math.max(0, progressHistory.length - WINDOW_SIZE_DATA_POINTS),
    );

    // Remove all elements outside the window.
    progressHistory.splice(0, windowStart);

    let secondsLeft = null;
    if (progressHistory.length >= MINIMUM_DATA_POINT_COUNT) {
      // Calculate the remaining time based on the average speed within the window.
      const windowLength = now - progressHistory[0].timestamp;
      const progressInWindow = progress - progressHistory[0].progress;
      const progressPerSecond = (progressInWindow / windowLength) * 1000;
      const progressLeft = 1 - progress;
      secondsLeft = Math.max(0, Math.round(progressLeft / progressPerSecond));
    }

    // Update state if anything changed. We actually check for equality here to
    // avoid useless redraws.
    if (uploadState.secondsLeft !== secondsLeft || uploadState.currentProgress !== progress) {
      dispatch({
        type: 'UPLOAD_PROGRESS_UPDATE',
        payload: { secondsLeft, currentProgress: progress },
      });
    }
  }

  useEffect(() => {
    // To still update the time estimation, we make sure to call `onProgress` at
    // least every so often.
    const interval = setInterval(() => {
      if (uploadState.state !== STATE_UPLOADING) {
        return;
      }

      const lastProgress = progressHistory[progressHistory.length - 1];
      const timeSinceLastUpdate = Date.now() - (lastProgress?.timestamp || 0);
      if (timeSinceLastUpdate > 3000) {
        onProgress(lastProgress.progress)
      }
    }, 1000);

    return () => clearInterval(interval);
  });

  async function handleUpload() {
    if (title === '' || presenter === '' || series.key === '-1' || visibility.key === '-1' || email === '') {
      dispatch({ type: 'UPLOAD_ERROR', payload: t('save-creation-form-invalid') });
      return;
    }

    settings.upload = {
      ...settings.upload, metaData: {
        title: title,
        presenter: presenter,
        email: email,
        series: series,
        visibility: visibility,
        edit: edit,
      }
    };

    dispatch({ type: 'UPLOAD_REQUEST' });
    if (settings.upload?.ingestInfoUrl) {
      const result = await getIngestInfo(settings.upload.ingestInfoUrl, series, visibility);
      console.debug('Ingest Info', result);
      settings.upload.seriesId = result.series.seriesId;
      settings.upload.ingestInfo = result;
    }

    progressHistory.push({
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
    progressHistory = [];

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
        return <UploadProgress
          currentProgress={uploadState.currentProgress}
          secondsLeft={uploadState.secondsLeft}
        />;
      case STATE_UPLOADED:
        return <UploadSuccess />;
      default: // STATE_NOT_UPLOADED or STATE_ERROR
        return <UploadForm {...{ uploadState, handleUpload }} />
    }
  })();

  return (
    <Container sx={{ display: 'flex', flexDirection: 'column', flex: '1 0 auto' }}>
      <Styled.h1 sx={{ textAlign: 'center', fontSize: ['26px', '30px', '32px'] }}>
        {possiblyDone ? t('save-creation-title-done') : t('save-creation-title')}
      </Styled.h1>

      <div sx={{
        display: 'flex',
        flexDirection: ['column', 'column', 'row'],
        '& > *': {
          flex: ['0', '0', '1 0 50%'],
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
            {uploadBox}
          </div>
        </div>

        <div>
          <Styled.h2
            sx={{ pb: 1, borderBottom: theme => `1px solid ${theme.colors.gray[2]}` }}
          >{t('save-creation-subsection-title-download')}</Styled.h2>

          <DownloadBox recordings={recordings} dispatch={dispatch} {...{ title, presenter }} />
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
        {!possiblyDone ? null : (
          <Button
            sx={{ whiteSpace: 'nowrap' }}
            title={t('save-creation-new-recording')}
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

const DownloadBox = ({ recordings, dispatch, presenter, title }) => (
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
          recording={recording}
          presenter={presenter}
          title={title}
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

const UploadForm = ({ uploadState, handleUpload }) => {
  const { t } = useTranslation();
  const opencast = useOpencast();
  const dispatch = useDispatch();
  const settings = useSettings();
  const { recordings, title, presenter, email, series, visibility, edit } = useStudioState();


  console.log(title, presenter, email, series, visibility, edit);

  function handleInputChange(event) {
    const target = event.target;

    let value = target.value;
    if (target.tagName === 'SELECT') {
      value = {
        key: target.value,
        value: target.options[target.selectedIndex].text,
      }
      }

    if (target.type === 'checkbox') {
      value = target.checked;
    }

    dispatch({
      type: {
        title: 'UPDATE_TITLE',
        presenter: 'UPDATE_PRESENTER',
        email: 'UPDATE_EMAIL',
        series: 'UPDATE_SERIES',
        visibility: 'UPDATE_VISIBILITY',
        edit: 'UPDATE_EDIT'
      }[target.name],
      payload: value,
    });

    if (target.name === 'presenter') {
      window.localStorage.setItem(LAST_PRESENTER_KEY, target.value);
    }
  }

  // If the user has not yet changed the value of the field and the last used
  // presenter name is used in local storage, use that.
  const presenterValue = presenter || window.localStorage.getItem(LAST_PRESENTER_KEY) || settings.user?.name || '';
  useEffect(() => {
    if (presenterValue !== presenter) {
      dispatch({ type: 'UPDATE_PRESENTER', payload: presenterValue });
    }
  });

  const emailValue = settings.user?.email;
  if (emailValue !== email) {
    dispatch({type: 'UPDATE_EMAIL', payload: emailValue });
  }

  const buttonLabel = !opencast.prettyServerUrl()
    ? t('save-creation-button-upload')
    : (
      <Trans i18nKey="save-creation-upload-to">
        Upload to <code sx={{
          backgroundColor: 'rgba(0, 0, 0, 0.1)',
          borderRadius: '5px',
          padding: '1px 3px',
        }}>{{ server: opencast.prettyServerUrl() }}</code>
      </Trans>
    );

  return (
    <React.Fragment>
      <FormField label={t('save-creation-label-title')}>
        <Input
          name="title"
          autoComplete="off"
          defaultValue={title}
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
          defaultValue={email}
          onChange={handleInputChange}
          type="email"
        />
      </FormField>

      <FormField label={t('save-creation-label-series')}>
        <select
          sx={{ variant: 'styles.select' }}
          name="series"
          defaultValue={series.id}
          onChange={handleInputChange}
        >
          <option value="-1">Please select...</option>
          {settings.seriesList?.map(s => (
            <option value={s.id} key={s.id}>
              {s.title}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label={t('save-creation-label-visibility')}>
        <select
          sx={{ variant: 'styles.select' }}
          name="visibility"
          defaultValue={visibility.id}
          onChange={handleInputChange}
        >
          <option value="-1">Please select...</option>
          {settings.visibilityList.map(v => (
            <option value={v.id} key={v.id}>
              {v.name}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label={t('save-creation-label-edit')}>
        <input
          name="edit"
          defaultChecked={edit}
          onChange={handleInputChange}
          type="checkbox"
        />
      </FormField>

      <Button
        title={t('save-creation-button-upload')}
        onClick={handleUpload}
        disabled={recordings.length === 0}
      >
        <FontAwesomeIcon icon={faUpload} />
        {buttonLabel}
      </Button>

      <Box sx={{ mt: 2 }}>
        {uploadState.state === STATE_ERROR && (
          <Notification isDanger>{uploadState.error}</Notification>
        )}
      </Box>
    </React.Fragment>
  );
}

// Shown during upload. Shows a progressbar, the percentage of data already
// uploaded and `secondsLeft` nicely formatted as human readable time.
const UploadProgress = ({ currentProgress, secondsLeft }) => {
  const { t, i18n } = useTranslation();

  // Progress as percent with one fractional digit, e.g. 27.3%.
  const roundedPercent = Math.min(100, currentProgress * 100).toLocaleString(i18n.language, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

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
        {roundedPercent}
      </Progress>
      <Text variant='text' sx={{ textAlign: 'center', mt: 2 }}>{t('upload-notification')}</Text>
    </React.Fragment>
  );
}

// Shown if the upload was successful. A big green checkmark and a text.
const UploadSuccess = () => {
  const { t } = useTranslation();
  const { edit } = useStudioState();

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
      <Text sx={{ textAlign: 'center', mt: 2 }}>{edit ? t('message-upload-complete-explanation-edit') : t('message-upload-complete-explanation')}</Text>
    </React.Fragment>
  );
}
