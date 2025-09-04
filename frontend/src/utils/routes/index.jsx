import { lazy } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import ScrollToTopOnRouteChange from '@hocs/withScrollTopOnRouteChange';
import withLazyLoadably from '@hocs/withLazyLoadably';
const Dashboard1Page = withLazyLoadably(lazy(() => import('@/pages/dashboardsPages/dashboard1')));

function Router() {
	return (
		<BrowserRouter>
			<ScrollToTopOnRouteChange>
				<Routes>
                <Route path="dashboard1" element={<Dashboard1Page />} />
                </Routes>
        </ScrollToTopOnRouteChange>
		</BrowserRouter>
	);
}