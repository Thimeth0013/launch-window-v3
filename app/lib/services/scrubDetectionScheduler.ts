// app/lib/services/scrubDetectionScheduler.ts
import axios from 'axios';
import Launch from '@/app/lib/db/models/Launch';

const LAUNCH_LIBRARY_API = 'https://ll.thespacedevs.com/2.3.0';

export async function checkForScrub(launch: any) {
  try {
    console.log(`🔍 [SCRUB_CHECK] Checking for updates on ${launch.name}`);
    
    // Fetch fresh data from API for this specific launch
    const response = await axios.get(
      `${LAUNCH_LIBRARY_API}/launches/${launch.id}/`,
      { 
        params: { mode: 'detailed' },
        timeout: 10000 
      }
    );

    const freshData = response.data;

    // Check if status or time changed
    const oldDate = new Date(launch.date);
    const newDate = new Date(freshData.net);
    const dateChanged = oldDate.getTime() !== newDate.getTime();
    const statusChanged = launch.status?.name !== freshData.status?.name;
    
    const hasChanged = dateChanged || statusChanged;

    if (hasChanged) {
      console.log(`🔄 [SCRUB_DETECTED] Launch ${launch.name} updated:`, {
        oldDate: oldDate.toISOString(),
        newDate: newDate.toISOString(),
        oldStatus: launch.status?.name,
        newStatus: freshData.status?.name
      });

      // Update database with fresh data
      await Launch.findOneAndUpdate(
        { id: launch.id },
        {
          ...freshData,
          date: new Date(freshData.net),
          net: freshData.net ? new Date(freshData.net) : null,
          last_updated: new Date(),
          window_end: freshData.window_end ? new Date(freshData.window_end) : null,
          window_start: freshData.window_start ? new Date(freshData.window_start) : null,
          provider: freshData.launch_service_provider?.name || 'Unknown'
        },
        { new: true }
      );

      // Return updated launch data
      return {
        ...launch,
        ...freshData,
        date: newDate,
        net: newDate,
        status: freshData.status,
        last_updated: new Date(),
        scrubDetected: true,
        changeType: dateChanged ? 'TIME_CHANGE' : statusChanged ? 'STATUS_CHANGE' : 'BOTH'
      };
    }

    console.log(`✅ [NO_CHANGES] ${launch.name} is up to date`);
    return launch;
  } catch (error: any) {
    console.error(`❌ [SCRUB_CHECK_ERROR] Failed to check for scrub:`, error.message);
    // Return original launch data if check fails
    return launch;
  }
}