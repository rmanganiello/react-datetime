import PropTypes from 'prop-types';
import moment from 'moment';
import React from 'react';
import DaysView from './DaysView';
import MonthsView from './MonthsView';
import YearsView from './YearsView';
import TimeView from './TimeView';
import onClickOutside from 'react-onclickoutside';

var viewModes = {
	YEARS: 'years',
	MONTHS: 'months',
	DAYS: 'days',
	TIME: 'time',
};

var TYPES = PropTypes;
var nofn = function () {};
var datetype = TYPES.oneOfType([ TYPES.instanceOf(moment), TYPES.instanceOf(Date), TYPES.string ]);

export default class Datetime extends React.Component {
	static propTypes = {
		value: datetype,
		initialValue: datetype,
		initialViewDate: datetype,
		initialViewMode: TYPES.oneOf([viewModes.YEARS, viewModes.MONTHS, viewModes.DAYS, viewModes.TIME]),
		onOpen: TYPES.func,
		onClose: TYPES.func,
		onChange: TYPES.func,
		onNavigate: TYPES.func,
		onBeforeNavigate: TYPES.func,
		onNavigateBack: TYPES.func,
		onNavigateForward: TYPES.func,
		updateOnView: TYPES.string,
		locale: TYPES.string,
		utc: TYPES.bool,
		displayTimeZone: TYPES.string,
		input: TYPES.bool,
		dateFormat: TYPES.oneOfType([TYPES.string, TYPES.bool]),
		timeFormat: TYPES.oneOfType([TYPES.string, TYPES.bool]),
		inputProps: TYPES.object,
		timeConstraints: TYPES.object,
		isValidDate: TYPES.func,
		open: TYPES.bool,
		strictParsing: TYPES.bool,
		closeOnSelect: TYPES.bool,
		closeOnTab: TYPES.bool,
		renderView: TYPES.func,
		renderInput: TYPES.func,
		renderDay: TYPES.func,
		renderMonth: TYPES.func,
		renderYear: TYPES.func,
	}

	static defaultProps = {
		onOpen: nofn,
		onClose: nofn,
		onCalendarOpen: nofn,
		onCalendarClose: nofn,
		onChange: nofn,
		onNavigate: nofn,
		onBeforeNavigate: function(next) { return next; }, 
		onNavigateBack: nofn,
		onNavigateForward: nofn,
		dateFormat: true,
		timeFormat: true,
		utc: false,
		className: '',
		input: true,
		inputProps: {},
		timeConstraints: {},
		isValidDate: function() { return true; },
		strictParsing: true,
		closeOnSelect: false,
		closeOnTab: true,
		closeOnClickOutside: true
	}

	// Make moment accessible through the Datetime class
	static moment = moment;

	constructor( props ) {
		super( props );
		this.state = this.getInitialState( props );
	}

	render() {
		var cn = this.getClassName();

		return (
			<ClickableWrapper className={ cn } onClickOut={ this._handleClickOutside }>
				{ this.renderInput() }
				<div className="rdtPicker">
					{ this.renderView( this.state.currentView, this._renderCalendar ) }
				</div>
			</ClickableWrapper>
		);
	}

	renderInput() {
		if ( !this.props.input ) return;

		const finalInputProps = {
			type: 'text',
			className: 'form-control',
			value: this.getInputValue(),
			...this.props.inputProps,
			onFocus: this._onInputFocus,
			onChange: this._onInputChange,
			onKeyDown: this._onInputKeyDown
		};

		if ( this.props.renderInput ) {   
			return (
				<div>
					{ this.props.renderInput( finalInputProps, this._openCalendar, this._closeCalendar ) }
				</div>
			);
		}

		return (
			<input { ...finalInputProps } />
		);
	}

	renderView( currentView, renderer ) {
		if ( this.props.renderView ) {
			return this.props.renderView( currentView, () => renderer(currentView) );
		}
		return renderer( this.state.currentView );
	}

	_renderCalendar = currentView => {
		const props = this.props;
		const state = this.state;

		let viewProps = {
			viewDate: state.viewDate.clone(),
			selectedDate: this.getSelectedDate(),
			isValidDate: props.isValidDate,
			updateDate: this._updateDate,
			navigate: this._navigate,
			showView: this._showView
		};

		// Probably updateOn, updateSelectedDate and setDate can be merged in the same method
		// that would update viewDate or selectedDate depending on the view and the dateFormat
		switch ( currentView ) {
			case viewModes.YEARS:
				// Used viewProps
				// { viewDate, selectedDate, renderYear, isValidDate, navigate, showView, updateDate }
				viewProps.renderYear = props.renderYear;
				return <YearsView {...viewProps } />;
			
			case viewModes.MONTHS:
				// { viewDate, selectedDate, renderMonth, isValidDate, navigate, showView, updateDate }
				viewProps.renderMonth = props.renderMonth;
				return <MonthsView {...viewProps} />;
			
			case viewModes.DAYS:
				// { viewDate, selectedDate, renderDay, isValidDate, navigate, showView, updateDate, timeFormat 
				viewProps.renderDay = props.renderDay;
				viewProps.timeFormat = this.getFormat('time');
				return <DaysView {...viewProps} />;
			
			default:
				// { viewDate, selectedDate, timeFormat, dateFormat, timeConstraints, setTime, showView }
				viewProps.dateFormat = this.getFormat('date');
				viewProps.timeFormat = this.getFormat('time');
				viewProps.timeConstraints = props.timeConstraints;
				viewProps.setTime = this._setTime;
				return <TimeView {...viewProps} />;
		}
	}

	getInitialState( p ) {
		var props = p || this.props;
		var inputFormat = this.getFormat('datetime');
		var selectedDate = this.parseDate( props.value || props.initialValue, inputFormat );

		this.checkTZ( props );

		return {
			open: !props.input,
			currentView: props.initialViewMode || this.getInitialView( this.getFormat('date') ),
			viewDate: this.getInitialViewDate( props.initialViewDate, selectedDate, inputFormat ),
			selectedDate: selectedDate && selectedDate.isValid() ? selectedDate : undefined,
			inputValue: this.getInitialInputValue( props, selectedDate, inputFormat )
		};
	}
	
	getInitialViewDate( propDate, selectedDate, format ) {
		var viewDate;
		if ( propDate ) {
			viewDate = this.parseDate( propDate, format );
			if ( viewDate && viewDate.isValid() ) {
				return viewDate;
			}
			else {
				this.log('The initialViewDated given "' + propDate + '" is not valid. Using current date instead.');
			}
		}
		else if ( selectedDate && selectedDate.isValid() ) {
			return selectedDate.clone();
		}
		return this.getInitialDate();
	}

	getInitialDate() {
		var m = this.localMoment();
		m.hour(0).minute(0).second(0).millisecond(0);
		return m;
	}

	getInitialView( dateFormat ) {
		if ( !dateFormat ) return viewModes.TIME;
		return this.getUpdateOn( dateFormat );
	}

	parseDate(date, dateFormat) {
		var parsedDate;

		if (date && typeof date === 'string')
			parsedDate = this.localMoment(date, dateFormat);
		else if (date)
			parsedDate = this.localMoment(date);

		if (parsedDate && !parsedDate.isValid())
			parsedDate = null;

		return parsedDate;
	}

	getClassName() {
		var cn = 'rdt';
		var props = this.props;
		var propCn = props.className;

		if ( Array.isArray( propCn ) ) {
			cn += ' ' + propCn.join(' ');
		}
		else if ( propCn ) {
			cn += ' ' + propCn;
		}

		if ( !props.input ) {
			cn += ' rdtStatic';
		}
		if ( this.isOpen() ) {
			cn += ' rdtOpen';
		}

		return cn;
	}
	
	isOpen() {
		return !this.props.input || (this.props.open === undefined ? this.state.open : this.props.open);
	}

	getUpdateOn( dateFormat ) {
		if ( this.props.updateOnView ) {
			return this.props.updateOnView;
		}

		if ( dateFormat.match(/[lLD]/) ) {
			return viewModes.DAYS;
		}

		if ( dateFormat.indexOf('M') !== -1 ) {
			return viewModes.MONTHS;
		}

		if ( dateFormat.indexOf('Y') !== -1 ) {
			return viewModes.YEARS;
		}

		return viewModes.DAYS;
	}

	getLocaleData( props ) {
		var p = props || this.props;
		return this.localMoment( p.value || p.defaultValue || new Date() ).localeData();
	}

	getDateFormat( locale ) {
		var format = this.props.dateFormat;
		if ( format === true ) return locale.longDateFormat('L');
		if ( format ) return format;
		return '';
	}

	getTimeFormat( locale ) {
		var format = this.props.timeFormat;
		if ( format === true ) {
			return locale.longDateFormat('LT');
		}
		return format || '';
	}

	getFormat( type ) {
		if ( type === 'date' ) {
			return this.getDateFormat( this.getLocaleData() );
		}
		else if ( type === 'time' ) {
			return this.getTimeFormat( this.getLocaleData() );
		}
		
		var locale = this.getLocaleData();
		var dateFormat = this.getDateFormat( locale );
		var timeFormat = this.getTimeFormat( locale );
		return dateFormat && timeFormat ? dateFormat + ' ' + timeFormat : (dateFormat || timeFormat );
	}

	_showView = ( view, date ) => {
		const d = ( date || this.state.viewDate ).clone();
		const nextView = this.props.onBeforeNavigate( view, this.state.currentView, d );

		if ( nextView && this.state.currentView !== nextView ) {
			this.props.onNavigate( nextView );
			this.setState({ currentView: nextView });
		}
	}

	updateTime( op, amount, type, toSelected ) {
		let update = {};
		const date = toSelected ? 'selectedDate' : 'viewDate';

		update[ date ] = this.state[ date ].clone()[ op ]( amount, type );

		this.setState( update );
	}

	viewToMethod = {days: 'date', months: 'month', years: 'year'};
	nextView = { days: 'time', months: 'days', years: 'months'};
	_updateDate = e => {
		let state = this.state;
		let currentView = state.currentView;
		let updateOnView = this.getUpdateOn( this.getFormat('date') );
		let viewDate = this.state.viewDate.clone();

		// Set the value into day/month/year
		viewDate[ this.viewToMethod[currentView] ](
			parseInt( e.target.getAttribute('data-value'), 10 )
		);

		// Need to set month and year will for days view (prev/next month)
		if ( currentView === 'days' ) {
			viewDate.month( parseInt( e.target.getAttribute('data-month'), 10 ) );
			viewDate.year( parseInt( e.target.getAttribute('data-year'), 10 ) );
		}

		let update = {viewDate: viewDate};
		if ( currentView === updateOnView ) {
			update.selectedDate = viewDate.clone();
			update.inputValue = viewDate.format( this.getFormat('datetime') );

			if ( this.props.open === undefined && this.props.input && this.props.closeOnSelect ) {
				this._closeCalendar();
			}

			this.props.onChange( viewDate.clone() );
		}
		else {
			this._showView( this.nextView[ currentView ], viewDate );
		}

		this.setState( update );
	}

	_navigate = ( modifier, unit ) => {
		let viewDate = this.state.viewDate.clone();
		
		// Subtracting is just adding negative time
		viewDate.add( modifier, unit );

		if ( modifier > 0 ) {
			this.props.onNavigateForward( modifier, unit );
		}
		else {
			this.props.onNavigateBack( -(modifier), unit );
		}

		this.setState({viewDate});
	}
	
	_setTime = ( type, value ) => {
		const state = this.state;
		let date = (state.selectedDate || state.viewDate).clone();
		
		date[ type ]( value );

		if ( !this.props.value ) {
			this.setState({
				selectedDate: date,
				viewDate: date.clone(),
				inputValue: date.format( this.getFormat('datetime') )
			});
		}

		this.props.onChange( date.clone() );
	}

	_openCalendar = () => {
		if ( this.isOpen() ) return;
		this.setState({open: true}, this.props.onOpen );
	}

	_closeCalendar = () => {
		if ( !this.isOpen() ) return;
		this.setState({open: false}, () => {
			 this.props.onClose( this.state.selectedDate || this.state.inputValue );
		});
	}

	_handleClickOutside = () => {
		var props = this.props;

		if ( props.input && this.state.open && props.open === undefined && props.closeOnClickOutside ) {
			this._closeCalendar();
		}
	}

	localMoment( date, format, props ) {
		props = props || this.props;
		var m = null;

		if (props.utc) {
			m = moment.utc(date, format, props.strictParsing);
		} else if (props.displayTimeZone) {
			m = moment.tz(date, format, props.displayTimeZone);
		} else {
			m = moment(date, format, props.strictParsing);
		}

		if ( props.locale )
			m.locale( props.locale );
		return m;
	}

	checkTZ( props ) {
		if ( props.displayTimeZone && !this.tzWarning && !moment.tz ) {
			this.tzWarning = true;
			this.log('displayTimeZone prop with value "' + props.displayTimeZone +  '" is used but moment.js timezone is not loaded.', 'error');
		}
	}

	componentDidUpdate( prevProps ) {
		if ( prevProps === this.props ) return;

		var needsUpdate = false;
		var thisProps = this.props;
		['locale', 'utc', 'displayZone', 'dateFormat', 'timeFormat'].forEach( function(p) {
			prevProps[p] !== thisProps[p] && (needsUpdate = true);
		});

		if ( needsUpdate ) {
			this.regenerateDates( this.props );
		}

		this.checkTZ( this.props );
	}

	regenerateDates(props) {
		var viewDate = this.state.viewDate.clone();
		var selectedDate = this.state.selectedDate && this.state.selectedDate.clone();

		if ( props.locale ) {
			viewDate.locale( props.locale );
			selectedDate &&	selectedDate.locale( props.locale );
		}
		if ( props.utc ) {
			viewDate.utc();
			selectedDate &&	selectedDate.utc();
		}
		else if ( props.displayTimeZone ) {
			viewDate.tz( props.displayTimeZone );
			selectedDate &&	selectedDate.tz( props.displayTimeZone );
		}
		else {
			viewDate.locale();
			selectedDate &&	selectedDate.locale();
		}

		var update = { viewDate: viewDate, selectedDate: selectedDate};
		if ( selectedDate && selectedDate.isValid() ) {
			update.inputValue = selectedDate.format( this.getFormat('datetime') );
		}
		
		this.setState( update );
	}

	getSelectedDate() {
		if ( this.props.value === undefined ) return this.state.selectedDate;
		var selectedDate = this.parseDate( this.props.value, this.getFormat('datetime') );
		return selectedDate && selectedDate.isValid() ? selectedDate : false;
	}

	getInitialInputValue( props, selectedDate, inputFormat ) {
		if ( props.inputProps.value )
			return props.inputProps.value;
		
		if ( selectedDate && selectedDate.isValid() )
			return selectedDate.format( inputFormat );
		
		if ( props.value && typeof props.value === 'string' )
			return props.value;
		
		if ( props.initialValue && typeof props.initialValue === 'string' )
			return props.initialValue;
		
		return '';
	}

	getInputValue() {
		var selectedDate = this.getSelectedDate();
		return selectedDate ? selectedDate.format( this.getFormat('datetime') ) : this.state.inputValue;
	}

	/**
	 * Set the date that is currently shown in the calendar.
	 * This is independent from the selected date and it's the one used to navigate through months or days in the calendar.
	 * @param dateType date
	 * @public
	 */
	setViewDate( date ) {
		var me = this;
		var logError = function() {
			return me.log( 'Invalid date passed to the `setViewDate` method: ' + date );
		};

		if ( !date ) return logError();
		
		var viewDate;
		if ( typeof date === 'string' ) {
			viewDate = this.localMoment(date, this.getFormat('datetime') );
		}
		else {
			viewDate = this.localMoment( date );
		}

		if ( !viewDate || !viewDate.isValid() ) return logError();
		this.setState({ viewDate: viewDate });
	}

	/**
	 * Set the view currently shown by the calendar. View modes shipped with react-datetime are 'years', 'months', 'days' and 'time'.
	 * @param TYPES.string mode 
	 */
	setViewMode( mode ) {
		this.showView( mode )();
	}

	log( message, method ) {
		var con = typeof window !== 'undefined' && window.console;
		if ( !con ) return;

		if ( !method ) {
			method = 'warn';
		}
		con[ method ]( '***react-datetime:' + message );
	}

	_onInputFocus = e => {
		if ( !this.callHandler( this.props.inputProps.onFocus, e ) ) return;
		this._openCalendar();
	}

	_onInputChange = e => {
		if ( !this.callHandler( this.props.inputProps.onChange, e ) ) return;

		const value = e.target ? e.target.value : e;
		const localMoment = this.localMoment( value, this.getFormat('datetime') );
		let update = { inputValue: value };

		if ( localMoment.isValid() ) {
			update.selectedDate = localMoment;
			update.viewDate = localMoment.clone().startOf('month');
		}
		else {
			update.selectedDate = null;
		}

		this.setState( update, () => {
			this.props.onChange( localMoment.isValid() ? localMoment : this.state.inputValue );
		});
	}

	_onInputKeyDown = e => {
		if ( !this.callHandler( this.props.inputProps.onKeyDown, e ) ) return;

		if ( e.which === 9 && this.props.closeOnTab ) {
			this._closeCalendar();
		}
	}

	callHandler( method, e ) {
		if ( !method ) return true;
		return method(e) !== false;
	}
}

class ClickOutBase extends React.Component {
	render() {
		return (
			<div className={ this.props.className }>
				{ this.props.children }
			</div>
		);
	}
	handleClickOutside(e) {
		this.props.onClickOut( e );
	}
}

const ClickableWrapper = onClickOutside( ClickOutBase );
