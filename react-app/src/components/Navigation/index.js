import React from 'react';
import { NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import ProfileButton from './ProfileButton';
import NotificationButton from './NotificationButton';
import './Navigation.css';

function Navigation({ hasWorkspace }) {
	const sessionUser = useSelector(state => state.session.user);

	return (
		<ul id='navigation_container'>
			<li>
				<img id="navigation_logo" className="logo" src="/klack_logo_white.svg" alt="logo" />
			</li>
			{
				hasWorkspace ?
					<button id="navigation_search">
						<span>
							Search {sessionUser.active_workspace.name}
						</span>
						<i className="fa-solid fa-magnifying-glass" />
					</button> :
					<div></div>
			}
			<li id="navigation_dropdowns">
				<NotificationButton user={sessionUser} hasWorkspace={hasWorkspace} />
				<ProfileButton user={sessionUser} hasWorkspace={hasWorkspace} />
			</li>
		</ul>
	);
}

export default Navigation;
