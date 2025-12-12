
import React from 'react';

const AppLoading = (props) => {
  return (
    <>
      <div id="default_loader" className="loader">
        <div className="loader-inner">
          <div className="loader-line-wrap">
            <div className="loader-line"></div>
          </div>
          <div className="loader-line-wrap">
            <div className="loader-line"></div>
          </div>
          <div className="loader-line-wrap">
            <div className="loader-line"></div>
          </div>
          <div className="loader-line-wrap">
            <div className="loader-line"></div>
          </div>
          <div className="loader-line-wrap">
            <div className="loader-line"></div>
          </div>
        </div>
      </div>
      <p>{props.message ? props.message : 'Loading'}</p>
    </>
  )
}

export default AppLoading;