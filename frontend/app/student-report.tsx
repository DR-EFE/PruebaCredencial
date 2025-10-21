import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';

// A simple component for bar chart
const BarChart = ({ data }) => {
    const maxValue = Math.max(...data.map(d => d.value), 1); // Avoid division by zero
    return (
        <View style={styles.chartContainer}>
            {data.map((item, index) => (
                <View key={index} style={styles.barWrapper}>
                    <View style={[styles.bar, { height: `${(item.value / maxValue) * 100}%`, backgroundColor: item.color }]} />
                    <Text style={styles.barValue}>{item.value}</Text>
                    <Text style={styles.barLabel}>{item.label}</Text>
                </View>
            ))}
        </View>
    );
};

export default function StudentReportScreen() {
    const { materiaId, boleta } = useLocalSearchParams();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [student, setStudent] = useState(null);
    const [materia, setMateria] = useState(null);
    const [attendanceStats, setAttendanceStats] = useState(null);

    useEffect(() => {
        if (materiaId && boleta) {
            loadStudentReport();
        }
    }, [materiaId, boleta]);

    const loadStudentReport = async () => {
        setLoading(true);
        try {
            // Fetch student and materia info
            const { data: studentData, error: studentError } = await supabase.from('estudiantes').select('*').eq('boleta', boleta).single();
            if (studentError) throw studentError;
            setStudent(studentData);

            const { data: materiaData, error: materiaError } = await supabase.from('materias').select('*').eq('id', materiaId).single();
            if (materiaError) throw materiaError;
            setMateria(materiaData);

            // Fetch attendance for this student in this course
            const { data: attendanceData, error: attendanceError } = await supabase
                .from('asistencias')
                .select('estado')
                .eq('materia_id', materiaId)
                .eq('boleta', boleta);
            
            if (attendanceError) throw attendanceError;

            const presentes = attendanceData.filter(a => a.estado === 'presente').length;
            const tardanzas = attendanceData.filter(a => a.estado === 'tardanza').length;
            
            // To get 'faltas', we need total sessions for the materia
            const { count: totalSesiones, error: sesionError } = await supabase
                .from('sesiones')
                .select('*', { count: 'exact', head: true })
                .eq('materia_id', materiaId)
                .eq('estado', 'impartida');

            if (sesionError) throw sesionError;

            const faltas = totalSesiones - (presentes + tardanzas);

            setAttendanceStats({ presentes, tardanzas, faltas: faltas > 0 ? faltas : 0, totalSesiones });

        } catch (error) {
            console.error(error);
            // Handle error display
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <View style={styles.centerContainer}><ActivityIndicator size="large" color="#2563eb" /></View>;
    }

    if (!student || !materia || !attendanceStats) {
        return <View style={styles.centerContainer}><Text>No se pudo cargar la información.</Text></View>;
    }

    const chartData = [
        { label: 'Presente', value: attendanceStats.presentes, color: '#10b981' },
        { label: 'Tardanza', value: attendanceStats.tardanzas, color: '#f59e0b' },
        { label: 'Falta', value: attendanceStats.faltas, color: '#ef4444' },
    ];

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                 <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{`${student.nombre} ${student.apellido}`}</Text>
            </View>
            <View style={styles.content}>
                <Text style={styles.boletaText}>Boleta: {student.boleta}</Text>
                <Text style={styles.materiaText}>Materia: {materia.nombre}</Text>
                
                <View style={styles.chartCard}>
                    <Text style={styles.cardTitle}>Resumen de Asistencia ({attendanceStats.totalSesiones} sesiones)</Text>
                    <BarChart data={chartData} />
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb' },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 50,
        paddingBottom: 16,
        paddingHorizontal: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    backButton: {
        marginRight: 16,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
        flex: 1,
    },
    content: {
        padding: 20,
    },
    boletaText: {
        fontSize: 16,
        color: '#6b7280',
        marginBottom: 4,
    },
    materiaText: {
        fontSize: 16,
        color: '#6b7280',
        marginBottom: 24,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
        color: '#111827',
    },
    chartCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
    },
    chartContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        height: 150,
        alignItems: 'flex-end',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        paddingBottom: 16,
    },
    barWrapper: {
        flex: 1,
        alignItems: 'center',
    },
    bar: {
        width: 35,
        borderTopLeftRadius: 6,
        borderTopRightRadius: 6,
    },
    barValue: {
        position: 'absolute',
        top: -20,
        fontWeight: 'bold',
        color: '#374151',
    },
    barLabel: {
        marginTop: 8,
        fontSize: 12,
        color: '#6b7280',
    },
});
