//; -*- mode: rjsx;-*-
/** @jsx jsx */
import React from 'react';
import { jsx, Styled } from 'theme-ui';
import { Container } from '@theme-ui/components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGlobeEurope, faEnvelope, faPhone } from '@fortawesome/free-solid-svg-icons';

function LegalNotices() {
  return (
    <article>
      <Styled.h2>ELAN e.V.</Styled.h2>

      <Styled.p>
        The e-learning academic network (ELAN e.V.) is a German non-profit organization supporting
        higher-education organizations in all matters related to e-learning. Our services include
        practical tips about how to use digital technologies in education, legal advice and
        development of free, open-source software to support education.
      </Styled.p>

      <Styled.h3>Contact</Styled.h3>

      <Styled.p>
        Dr. Norbert Kleinefeld, Geschäftsführer
        <br />
        Karlstr. 23
        <br />
        D-26123 Oldenburg
      </Styled.p>

      <Styled.p>
        <FontAwesomeIcon icon={faGlobeEurope} />{' '}
        <Styled.a href="https://elan-ev.de">elan-ev.de</Styled.a>
        <br />
        <FontAwesomeIcon icon={faEnvelope} />{' '}
        <Styled.a href="mailto:kontakt@elan-ev.de">kontakt@elan-ev.de</Styled.a>
        <br />
        <FontAwesomeIcon icon={faPhone} />{' '}
        <Styled.a href="tel:+4944199866610">+49&thinsp;441 998&thinsp;666&thinsp;10</Styled.a>
      </Styled.p>

      <Styled.p>
        Registergericht: Amtsgericht Oldenburg
        <br />
        Registernummer: VR 200644
        <br />
        USt.-ID-Nr.: DE 265901392
      </Styled.p>
    </article>
  );
}

function About(props) {
  return (
    <Container>
      <article sx={{ maxWidth: '900px', margin: '0 auto' }}>
        <header>
          <Styled.h1>Podcast Studio</Styled.h1>
        </header>
        <Styled.p>
          Podcast Studio allows you to record a podcast in your browser which can
          then be uploaded to the Podcast Video Portal.
        </Styled.p>
        <Styled.p>
          For more information on using Podcast Studio, see&nbsp;
          <Styled.a target="_blank"
            href="https://www.mypodcasts.manchester.ac.uk/staff-faqs/record-podcast/podcast-studio">
            this FAQ
          </Styled.a>
        </Styled.p>
        <Styled.p>
          Podcast Studio recordings can be managed from the My Videos tab on the
          Video Portal, just like uploaded videos.
        </Styled.p>
        <Styled.p>
          You can choose to record video from the display, camera or both together.
          You need to ensure you have a camera connected if you wish to record
          this as part of the podcast, and also a microphone must be connected to
          record audio.
        </Styled.p>

        <Styled.h2>How to use</Styled.h2>
        <Styled.ol>
          <Styled.li>
            If you want to record a presentation as part of the podcast, ensure it
            is already open.
          </Styled.li>
          <Styled.li>
            In the Recording tab, select what you want to record (display and/or
            camera).
          </Styled.li>
          <Styled.li>
            When choosing display, a popup will appear which allows you to
            select what you want to record (you may need to grant permissions
            to the browser to access your display/camera). The options for
            selecting what to record appear slightly differently depending on the
            browser you are using, but the options are:
            <Styled.ul>
              <Styled.li>
                Your entire display: so whatever you see will be recorded
              </Styled.li>
              <Styled.li>
                Choose a specific application window: so you can choose to
                share Powerpoint, for example, or a browser tab/window
              </Styled.li>
            </Styled.ul>
          </Styled.li>
          <Styled.li>
            Your selected resource will be shown in the Podcast Studio tab. Press
            Next to continue.
            Note to remove the sharing bar from the bottom of the screen,
            press <Styled.em>hide</Styled.em>.
          </Styled.li>
          <Styled.li>
            Choose whether to record audio (with a microphone) or have no
            audio on the podcast.
          </Styled.li>
          <Styled.li>
            Press the record button (red circle) to begin the recording.
          </Styled.li>
          <Styled.li>
            Once you have finished, press the stop button and you will be shown
            a preview of the recording. Choose to discard and record again if
            you wish, or press next to continue.
          </Styled.li>
          <Styled.li>
            Add a title, choose where the video should be uploaded to, tick the
            option to edit before publishing if you wish, then click upload.
          </Styled.li>
          <Styled.li>
            Once the upload has been processed – you will receive an email with
            a link to view it (and additionally to edit if this option was selected).
          </Styled.li>
        </Styled.ol>

        <Styled.h2>Uploading Issues</Styled.h2>
        <Styled.p>
          If you encounter the <Styled.em>&quot;connection to podcast server is not fully
          established&quot;</Styled.em> error when trying to upload your recording,
          this is because your authentication session has timed out.
        </Styled.p>

        <Styled.p>
          If this happens, you should open another browser tab and navigate to the
          University Central Authentication Service (CAS) <Styled.a target="_blank"
          href="https://login.manchester.ac.uk/cas/login">login page</Styled.a>.
          Log in if you are not already, (or log out and back in if necessary).
        </Styled.p>

        <Styled.p>
          Return back to the Podcast Studio tab and, in some cases, the browser
          manages to refresh your authentication status after a few minutes – but
          if this does not happen, you should save any recordings you have made
          so they do not get discarded, and then refresh the page.
        </Styled.p>

        <Styled.p>
          Saved recordings can be manually uploaded to the Video Portal,
          further information can be found <Styled.a target="_blank"
          href="https://www.mypodcasts.manchester.ac.uk/staff-faqs/record-podcast/studio-issues/">here</Styled.a>.
        </Styled.p>

        { process.env.REACT_APP_INCLUDE_LEGAL_NOTICES === '1' && (
          <React.Fragment>
            <Styled.h2>Support</Styled.h2>
            <Styled.p>
              If you are experiencing any difficulties or found any bugs,
              please take a look at the{' '}
              <Styled.a href="https://github.com/elan-ev/opencast-studio/issues">
                issue tracker on GitHub
              </Styled.a>.
              Before filing a new issue, please check if one about your topic already exists.
              We regularly check incoming issues and do our best to address bugs in a timely manner.
            </Styled.p>
            <Styled.p>
              If you are interested in additional development
              or want to support the development of Opencast Studio, please contact{' '}
              <Styled.a href="mailto:opencast-support@elan-ev.de">
                opencast-support@elan-ev.de
              </Styled.a>.
            </Styled.p>
          </React.Fragment>
        )}

        <Styled.h2>Credits</Styled.h2>
        <Styled.p>
          Thanks to the following people and institutions for contributing to this project:
        </Styled.p>
        <ul>
          <li>
            <Styled.a target="_blank" href="https://github.com/slampunk">Duncan Smith</Styled.a> for starting this
            project
          </li>
          <li>
            <Styled.a target="_blank" href="https://github.com/cilt-uct">University of Cape Town (CILT)</Styled.a>
            {' '}for letting Duncan start the project
          </li>
          <li>
            <Styled.a target="_blank" href="https://ethz.ch">ETH Zürich</Styled.a> for financial support and
            testing
          </li>
          <li>
            <Styled.a target="_blank" href="https://github.com/elan-ev">ELAN e.V.</Styled.a> for the re-implementation
            and the ongoing development
          </li>
          <li>
            And many members from the Opencast community who helped along the way.
          </li>
        </ul>

        { process.env.REACT_APP_INCLUDE_LEGAL_NOTICES === '1' && <LegalNotices /> }

      </article>
    </Container>
  );
}

export default About;
