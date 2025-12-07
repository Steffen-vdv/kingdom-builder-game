import React from 'react';
import {
	type ResourceV2MetadataSnapshot,
	type ResourceV2ValueSnapshot,
} from '../../translation';
import { formatResourceMagnitude } from './ResourceButton';

export interface ResourceWithBoundButtonProps {
	metadata: ResourceV2MetadataSnapshot;
	snapshot: ResourceV2ValueSnapshot;
	boundMetadata: ResourceV2MetadataSnapshot;
	boundSnapshot: ResourceV2ValueSnapshot;
	boundType: 'upper' | 'lower';
	onShow: (resourceId: string) => void;
	onHide: () => void;
}

/**
 * A resource button that displays the current value alongside a bound value.
 * For example: "👥 3/5" showing population current vs max population.
 */
const ResourceWithBoundButton: React.FC<ResourceWithBoundButtonProps> = ({
	metadata,
	snapshot,
	boundMetadata,
	boundSnapshot,
	boundType,
	onShow,
	onHide,
}) => {
	const handleShow = React.useCallback(() => {
		onShow(snapshot.id);
	}, [onShow, snapshot.id]);

	const iconLabel = metadata.icon ?? '?';
	const currentValue = formatResourceMagnitude(snapshot.current, metadata);
	const boundValue = formatResourceMagnitude(
		boundSnapshot.current,
		boundMetadata,
	);

	const displayValue =
		boundType === 'upper'
			? `${currentValue}/${boundValue}`
			: `${boundValue}/${currentValue}`;

	const ariaLabel = `${metadata.label}: ${displayValue}`;

	return (
		<button
			type="button"
			className="bar-item hoverable cursor-help relative overflow-visible"
			onMouseEnter={handleShow}
			onMouseLeave={onHide}
			onFocus={handleShow}
			onBlur={onHide}
			onClick={handleShow}
			aria-label={ariaLabel}
		>
			<span aria-hidden="true">{iconLabel}</span>
			{displayValue}
		</button>
	);
};

export default ResourceWithBoundButton;
