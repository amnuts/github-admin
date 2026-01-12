import {
    ActionIcon,
    getThemeColor,
    rem,
    useComputedColorScheme,
    useMantineColorScheme,
    useMantineTheme,
    VisuallyHidden
} from '@mantine/core';
import {IconMoon, IconSun} from '@tabler/icons-react';


const ThemeToggle = () => {
    const theme = useMantineTheme();
    const {setColorScheme} = useMantineColorScheme({
        keepTransitions: true,
    });
    const computedColorScheme = useComputedColorScheme('dark');

    const iconProps = {
        style: {width: rem(18), height: rem(18)},
        stroke: 2
    };

    const sunColour = getThemeColor('yellow.9', theme);
    const moonColour = getThemeColor('gray.4', theme);

    const sunIcon = (
        <>
            <IconSun {...iconProps} color={sunColour} fill={sunColour}/>
            <VisuallyHidden>Light theme</VisuallyHidden>
        </>
    );

    const moonIcon = (
        <>
            <IconMoon {...iconProps} color={moonColour} fill={moonColour}/>
            <VisuallyHidden>Dark theme</VisuallyHidden>
        </>
    );

    return (
        <ActionIcon
            onClick={() => setColorScheme(computedColorScheme === 'light' ? 'dark' : 'light')}
            aria-label="Toggle color scheme"
            color={computedColorScheme === 'light' ? 'dark.3' : 'gray.1'}
            autoContrast
        >
            {computedColorScheme === 'light' ? moonIcon : sunIcon}
        </ActionIcon>
    )
}

export default ThemeToggle;
