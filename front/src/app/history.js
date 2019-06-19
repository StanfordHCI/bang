/** history.js
 *  back-process for front-end
 * 
 *  exports browser history

 *  called by:
 *    1. src/actions/admin.js
 *    2. src/actions/app.js
 *    3. src/containers/admin/batchlist.js
 *    4. src/containers/admin/templatelist.js
 *    5. src/index.js
 *    
 */

import createHistory from 'history/createBrowserHistory'
export const history = createHistory()