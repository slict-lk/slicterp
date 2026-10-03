"use client";

import React from "react";
import { motion, HTMLMotionProps, Variants } from "framer-motion";
import { cn } from "@/lib/utils";

interface MotionProps extends HTMLMotionProps<"div"> {
    children: React.ReactNode;
    className?: string;
    delay?: number;
    duration?: number;
}

// Fade In: Simple opacity transition
export const FadeIn = ({ children, className, delay = 0, duration = 0.5, ...props }: MotionProps) => {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration, delay, ease: "easeOut" }}
            className={className}
            {...props}
        >
            {children}
        </motion.div>
    );
};

// Slide Up: Moves up 20px and fades in
export const SlideUp = ({ children, className, delay = 0, duration = 0.4, ...props }: MotionProps) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration, delay, ease: "easeOut" }}
            className={className}
            {...props}
        >
            {children}
        </motion.div>
    );
};

// Scale In: Starts small and grows (Good for cards/modals)
export const ScaleIn = ({ children, className, delay = 0, duration = 0.3, ...props }: MotionProps) => {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration, delay, ease: "easeOut" }}
            className={className}
            {...props}
        >
            {children}
        </motion.div>
    );
};

// Stagger Container: Staggers the animation of its children
export const StaggerContainer = ({ children, className, staggerDelay = 0.1, ...props }: MotionProps & { staggerDelay?: number }) => {
    const containerVariants: Variants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: staggerDelay,
            },
        },
    };

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className={className}
            {...props}
        >
            {children}
        </motion.div>
    );
};

// Stagger Item: Child of StaggerContainer
export const StaggerItem = ({ children, className, ...props }: MotionProps) => {
    const itemVariants: Variants = {
        hidden: { opacity: 0, y: 15 },
        show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
    };

    return (
        <motion.div
            variants={itemVariants}
            className={className}
            {...props}
        >
            {children}
        </motion.div>
    );
};

// Hover Card: Subtle lift on hover
export const HoverCard = ({ children, className, ...props }: MotionProps) => {
    return (
        <motion.div
            whileHover={{ y: -4, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)" }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            className={cn("bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700", className)}
            {...props}
        >
            {children}
        </motion.div>
    );
};
