import React, { useEffect } from 'react';
import { Box, Typography, Icon } from '@mui/material';
import { useReactory } from '@reactory/client-core/api/ApiProvider';

const Offline = (props: { onOfflineChanged: (isOffline: boolean) => void }) => {

  const TM_BASE_DEFAULT: number = 45000;
  const reactory = useReactory();
  const { onOfflineChanged } = props;
  const [timeout_base, setTimeoutBase] = React.useState<number>(TM_BASE_DEFAULT);
  const [offline, setOfflineStatus] = React.useState<boolean>(false);

  let timeoutMS: number = 45000;
  let totals = { error: 0, slow: 0, ok: 0, total: 0 };
  let last_slow = null;


  const getApiStatus = async (): Promise<void> => {
    const started = Date.now();

    try {
      const apiStatus = await reactory.status({ emitLogin: false, forceLogout: false });
      const done = Date.now();
      const api_ok = apiStatus.status === 'API OK'
      setOfflineStatus(!api_ok);
      if (offline !== !api_ok) {
        onOfflineChanged(!api_ok);
      }

      let isSlow = false;

      const newLast = {
        when: started,
        pingMS: done - started,
      };

      timeoutMS = timeout_base;

      //if our ping timeout is slow
      if (newLast.pingMS > 4000 && totals.total > 10) {
        last_slow = done;
        timeoutMS = timeout_base * 1.25;
      }

      //if our ping time is really low
      if (newLast.pingMS > 7000 && totals.total > 10) {
        isSlow = true;
        timeoutMS = timeout_base * 1.5;
      }

      let next_tm_base = TM_BASE_DEFAULT;
      if (totals.total > 5) {
        let avg: number = (totals.ok * 100) / totals.total;
        if (avg > 90) next_tm_base = TM_BASE_DEFAULT * 1.30
        if (avg > 95) next_tm_base = TM_BASE_DEFAULT * 1.5;
        if (avg > 98) next_tm_base = TM_BASE_DEFAULT * 2.5;
      }

      const newTotals = {
        error: totals.error,
        slow: isSlow ? totals.slow + 1 : totals.slow,
        ok: api_ok ? totals.ok + 1 : totals.ok,
        total: totals.total + 1,
      };

      totals = newTotals;

      // Convert to correct StatisticsInput format
      const statistic: any = {
        name: "user_session_api_status_totals",
        description: "User session API status monitoring",
        type: "counter",
        value: totals.total,
        unit: "requests",
        attributes: {
          user_id: reactory.getUser()?.id || 'unknown',
          error_count: totals.error,
          slow_count: totals.slow,
          ok_count: totals.ok,
          total_count: totals.total,
          ping_ms: newLast.pingMS,
          api_ok,
          is_slow: isSlow
        },
        timestamp: new Date(started),
        resource: {
          service_name: "reactory-pwa-client",
          service_version: reactory.version || '1.0.0',
          deployment_environment: process.env.NODE_ENV || 'development',
          host_name: window.location.hostname,
        }
      };

      reactory.stat("user_session_api_status_totals", statistic);
      reactory.emit('onApiStatusTotalsChange', { ...totals, ...newLast, api_ok, isSlow });

      if (next_tm_base !== timeout_base) setTimeoutBase(next_tm_base);

      setTimeout(() => {
        void getApiStatus();
      }, timeoutMS);

      reactory.debug(`Client Ping Totals:`, { totals: newTotals, nextIn: timeoutMS });
    } catch (error) {
      reactory.error(`Error while fetching api status`, { error: error });
      setOfflineStatus(true);
      onOfflineChanged(true);

      totals = {
        error: totals.error + 1,
        slow: totals.slow,
        ok: totals.ok + 1,
        total: totals.total + 1,
      };

      setTimeout(() => {
        void getApiStatus();
      }, timeoutMS);
    }
  };


  useEffect(() => {
    void getApiStatus();
  }, []);

  if (offline === false) return null;
  return (    
    <Box style={{ margin: 'auto', textAlign: 'center', paddingTop: '100px' }}>
      <Typography variant="h1" style={{ color: reactory.muiTheme.palette.error.main }}>
        <Icon style={{ fontSize: '100px' }}>cloud_off</Icon>
      </Typography>
      <Typography variant="body2">
        We are unable to connect you to our service at this time.
        This may be due to a poor internet connection or your
        device is currently offline.
      </Typography>

      <Typography variant="body2">
        This message will disappear as soon as we are able to establish a connection.
        If you accessed the system with an email link, please retry using this link in a few moments.
      </Typography>
    </Box>    
  )
}

export default Offline;